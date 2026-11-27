import tempfile
import unittest
from pathlib import Path

from zero_router.config import load_routing_config
from zero_router.policy import Engine, Operation


class RoutingConfigTests(unittest.TestCase):
    def test_repository_policy_loads_and_respects_zero_budget_state(self):
        root = Path(__file__).resolve().parents[1]
        config = load_routing_config(root / "ai-workflows" / "engine-routing.yaml")
        local, cloud = config.capabilities()
        self.assertFalse(local.enabled)
        self.assertFalse(cloud.enabled)
        self.assertIn(Operation.IMAGE_GENERATION, config.preferred_engines)
        self.assertFalse(config.allow_cloud_upload_by_default)
        self.assertFalse(config.silent_cloud_fallback)

    def test_cloud_upload_default_cannot_be_enabled(self):
        source = """version: 1
routing:
  default_mode: privacy_first
  allow_cloud_upload_by_default: true
  silent_cloud_fallback: false
  preserve_originals: true
engines:
  private_local: {enabled: false}
  cloud: {enabled: false}
operations:
  color_adjustment: {preferred_engine: private_local}
"""
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "routing.yaml"
            path.write_text(source, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Cloud upload"):
                load_routing_config(path)


if __name__ == "__main__":
    unittest.main()
