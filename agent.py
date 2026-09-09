import asyncio # Biblioteca para programação assíncrona
from pynput import keyboard # Biblioteca para escutar o teclado (atalho de mutar/desmutar)
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions, ChatContext
from livekit.agents.voice import VoiceActivityVideoSampler
from livekit.agents.utils import images
from livekit.plugins import noise_cancellation, google
from google.genai import types as genai_types
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION
from mem0 import AsyncMemoryClient
import logging
import os
import json

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


class Assistant(Agent):
    def __init__(self, chat_ctx: ChatContext = None):
        super().__init__(

            instructions=AGENT_INSTRUCTION,
            llm=google.beta.realtime.RealtimeModel(
                voice="Kore",
                temperature=0.6,
                media_resolution=genai_types.MediaResolution.MEDIA_RESOLUTION_LOW,
                image_encode_options=images.EncodeOptions(
                    format="JPEG",
                    quality=60,
                    resize_options=images.ResizeOptions(
                        width=768, height=768, strategy="scale_aspect_fit"
                    ),
                ),
                context_window_compression=genai_types.ContextWindowCompressionConfig(
                    trigger_tokens=25600,
                    sliding_window=genai_types.SlidingWindow(target_tokens=12800),
                ),
            ),
            chat_ctx=chat_ctx,
        )


async def entrypoint(ctx: agents.JobContext):
    
    async def shutdown_hook(chat_ctx: ChatContext, mem0: AsyncMemoryClient, memory_str: str):
        logging.info("Shutting down, saving chat context to memory...")

        messages_formatted = []

        logging.info(f"Chat context messages: {chat_ctx.items}")

        for item in chat_ctx.items:
            if not hasattr(item, 'content') or item.content is None:
              continue
            content_str = ''.join(item.content) if isinstance(item.content, list) else str(item.content)

            if memory_str and memory_str in content_str:
                continue

            if item.role in ['user', 'assistant']:
                messages_formatted.append({
                    "role": item.role,
                    "content": content_str.strip()
                })

        logging.info(f"Formatted messages to add to memory: {messages_formatted}")
        if not messages_formatted:
            logging.info("No new messages to save, skipping memory update.")
            return

        # Assuming user_id is consistent
        await mem0.add(messages_formatted, user_id="JoaoPedro")
        logging.info("Chat context saved to memory.")

    # Initialize Memory Client
    mem0 = AsyncMemoryClient()
    user_id = "JoaoPedro"

    # Load existing memories - try get_all first, fallback to search
    initial_ctx = ChatContext()
    memory_str = ''
    results = []
    
    try:
        # Try to get all memories for the user
        results = await mem0.get_all(user_id=user_id)
        logging.info(f"Retrieved {len(results) if results else 0} memories using get_all")
    except Exception as e:
        logging.warning(f"get_all failed: {e}. Trying search method...")
        try:
            # Fallback: use search with a broad query (empty query causes 400 error)
            response = await mem0.search("informações preferências contexto", filters={"user_id": user_id})
            results = response["results"] if isinstance(response, dict) and "results" in response else response
            logging.info(f"Retrieved {len(results) if results else 0} memories using search")
        except Exception as e2:
            logging.warning(f"Search also failed: {e2}. No memories loaded.")
            results = []

    if results:
        memories = [
            {
                "memory": result.get("memory") if isinstance(result, dict) else result.get("memory", ""),
                "updated_at": result.get("updated_at") if isinstance(result, dict) else result.get("updated_at", "")
            }
            for result in results
            if isinstance(result, dict) and result.get("memory")
        ]
        
        if memories:
            memory_str = json.dumps(memories, ensure_ascii=False)
            logging.info(f"Formatted memories: {memory_str}")
            initial_ctx.add_message(
                role="assistant",
                content=f"O nome do usuário é {user_id}. Aqui estão informações importantes sobre ele que você deve lembrar e usar nas conversas: {memory_str}."
            )
    else:
        logging.info("No memories found for this user. Starting fresh conversation.")

    await ctx.connect()

    session = AgentSession(
        video_sampler=VoiceActivityVideoSampler(speaking_fps=0.5, silent_fps=0.1),
    )

    agent = Assistant(chat_ctx=initial_ctx)

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(
            video_enabled=True,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Use a shutdown callback to capture the context at the end
    ctx.add_shutdown_callback(lambda: shutdown_hook(session._agent.chat_ctx, mem0, memory_str))

    await session.generate_reply(
        instructions=SESSION_INSTRUCTION  + "\nCumprimente o usuário de forma breve e confiante."
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )

