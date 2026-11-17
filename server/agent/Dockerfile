# Baseado no template oficial da LiveKit para agentes Python com pip.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

# Algumas dependências compilam extensões nativas durante o pip install.
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ python3-dev \
    && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" --uid 10001 appuser
USER appuser
WORKDIR /home/appuser

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "agent.py", "start"]
