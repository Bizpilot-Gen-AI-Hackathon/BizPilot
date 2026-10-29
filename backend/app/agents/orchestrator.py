class Orchestrator:
    """Phase-two specialist coordinator.

    Specialist calls should be sequential or tightly bounded in concurrency on the
    Gemini free tier because parallel calls multiply quota usage. Shared cache
    entries should be reused before starting another specialist.
    """

    async def run(self, user_context: dict, question: str) -> dict:
        raise NotImplementedError("Multi-agent orchestration is planned for phase 2.")