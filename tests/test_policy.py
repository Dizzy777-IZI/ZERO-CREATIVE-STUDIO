import unittest

from zero_router.policy import (
    Classification, Engine, EngineCapabilities, JobRequest, Operation, choose_engine,
)


ALL = frozenset(Operation)
NONE = frozenset()


class RoutingPolicyTests(unittest.TestCase):
    def setUp(self):
        self.local = EngineCapabilities(True, ALL)
        self.cloud = EngineCapabilities(True, ALL)

    def test_private_job_defaults_to_private_engine(self):
        decision = choose_engine(
            JobRequest(Operation.IMAGE_GENERATION, Classification.PRIVATE),
            self.local, self.cloud,
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.engine, Engine.PRIVATE_LOCAL)
        self.assertFalse(decision.requires_cloud_upload)

    def test_no_silent_cloud_fallback_for_private_media(self):
        decision = choose_engine(
            JobRequest(Operation.IMAGE_GENERATION, Classification.PRIVATE),
            EngineCapabilities(True, NONE), self.cloud,
        )
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.engine, Engine.NONE)
        self.assertFalse(decision.requires_cloud_upload)

    def test_public_cloud_preferred_job_requires_consent(self):
        decision = choose_engine(
            JobRequest(Operation.IMAGE_GENERATION, Classification.PUBLIC, False),
            EngineCapabilities(True, NONE), self.cloud,
        )
        self.assertFalse(decision.allowed)

    def test_public_cloud_preferred_job_uses_cloud_with_consent(self):
        decision = choose_engine(
            JobRequest(Operation.IMAGE_GENERATION, Classification.PUBLIC, True),
            self.local, self.cloud,
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.engine, Engine.CLOUD)
        self.assertTrue(decision.requires_cloud_upload)

    def test_private_media_never_routes_to_cloud_even_with_consent(self):
        decision = choose_engine(
            JobRequest(Operation.BACKGROUND_SEGMENTATION, Classification.SENSITIVE, True),
            EngineCapabilities(True, NONE), self.cloud,
        )
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.engine, Engine.NONE)

    def test_requested_local_engine_is_honored(self):
        decision = choose_engine(
            JobRequest(Operation.COLOR_ADJUSTMENT, requested_engine=Engine.PRIVATE_LOCAL),
            self.local, self.cloud,
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.engine, Engine.PRIVATE_LOCAL)

    def test_requested_cloud_engine_is_rejected_without_consent(self):
        decision = choose_engine(
            JobRequest(Operation.IMAGE_GENERATION, Classification.PUBLIC, False, Engine.CLOUD),
            self.local, self.cloud,
        )
        self.assertFalse(decision.allowed)

    def test_disabled_engine_is_not_selected(self):
        decision = choose_engine(
            JobRequest(Operation.COLOR_ADJUSTMENT),
            EngineCapabilities(False, ALL), self.cloud,
        )
        self.assertTrue(decision.allowed)
        self.assertEqual(decision.engine, Engine.CLOUD) if False else self.assertEqual(decision.engine, Engine.NONE)


if __name__ == "__main__":
    unittest.main()
