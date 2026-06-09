import asyncio # Biblioteca para programação assíncrona

from dotenv import load_dotenv # Carrega variáveis de ambiente de um arquivo .env

from pynput import keyboard # Biblioteca para escutar o teclado (atalho de mutar/desmutar)

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    noise_cancellation, # Importa o módulo de cancelamento de ruído
     google # Importa o plugin do Google para modelos de linguagem
)
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION

load_dotenv()# Carrega as variáveis de ambiente do arquivo .env


def iniciar_toggle_microfone(session: AgentSession, loop: asyncio.AbstractEventLoop):
    """Permite mutar/desmutar o microfone pressionando a tecla M.

    O listener roda numa thread separada, então usamos call_soon_threadsafe
    para alterar a entrada de áudio dentro do event loop do agente com segurança.
    """

    def alternar_mudo():
        # Inverte o estado atual da entrada de áudio do agente.
        ativo = session.input.audio_enabled
        session.input.set_audio_enabled(not ativo)
        if ativo:
            print("Microfone MUTADO (M para reativar)")
        else:
            print("Microfone ATIVO (M para mutar)")

    def ao_pressionar(key):
        try:
            if key.char and key.char.lower() == "m": # Detecta a tecla M
                loop.call_soon_threadsafe(alternar_mudo)
        except AttributeError:
            # Teclas especiais (Shift, Ctrl, etc.) não têm atributo .char
            pass

    listener = keyboard.Listener(on_press=ao_pressionar)
    listener.daemon = True # Encerra junto com o programa
    listener.start()
    print("Microfone ATIVO — pressione M a qualquer momento para mutar/desmutar.")
    return listener


class Assistant(Agent): # Define a classe Assistant que herda de Agent
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_INSTRUCTION, # Define as instruções do agente
            llm=google.beta.realtime.RealtimeModel( # Configura o modelo de linguagem em tempo real do Google
            voice="Kore", # Define a voz do agente (voz feminina)
            temperature=0.6,# Define a temperatura para controle de criatividade
        ),
            
        )
        


async def entrypoint(ctx: agents.JobContext): # Função de entrada assíncrona para o agente
    session = AgentSession(
        
    )

    await session.start( 
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(# Configurações de entrada da sala
            video_enabled=True, # Habilita vídeo na sala
            noise_cancellation=noise_cancellation.BVC(),#@ Habilita o cancelamento de ruído usando o plugin BVC
        ),
    )

    await ctx.connect()

    # Ativa o atalho da tecla M para mutar/desmutar o microfone.
    iniciar_toggle_microfone(session, asyncio.get_running_loop())

    await session.generate_reply(
        instructions=SESSION_INSTRUCTION + "\nCumprimente o usuário de forma breve e confiante." # Instruções específicas para a sessão
    )


if __name__ == "__main__":# Ponto de entrada do script
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))# Executa o aplicativo de agente com a função de entrada definida
