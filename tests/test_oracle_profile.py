import tempfile
import unittest
from pathlib import Path

import yaml

from zero_router.oracle_profile import load_oracle_free_profile


PROFILE = Path(__file__).parents[1] / "infra" / "oracle" / "always-free.yaml"


class OracleFreeProfileTests(unittest.TestCase):
    def test_repository_profile_is_valid_and_disabled(self):
        profile = load_oracle_free_profile(PROFILE)
        self.assertEqual(profile.shape, "VM.Standard.A1.Flex")
        self.assertEqual(profile.ocpus, 1)
        self.assertEqual(profile.memory_gb, 6)
        self.assertEqual(profile.boot_volume_gb, 50)

    def test_rejects_paid_fallback(self):
        data = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
        data["billing"]["paid_fallback"] = True
        self.assert_invalid(data)

    def test_rejects_more_than_free_ocpu_limit(self):
        data = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
        data["compute"]["ocpus"] = 4
        self.assert_invalid(data)

    def test_rejects_non_arm_shape(self):
        data = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
        data["compute"]["shape"] = "VM.Standard.E5.Flex"
        self.assert_invalid(data)

    def test_rejects_public_app_ingress(self):
        data = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
        data["network"]["public_app_ingress_ports"] = [8000]
        self.assert_invalid(data)

    def assert_invalid(self, data):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "profile.yaml"
            path.write_text(yaml.safe_dump(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_oracle_free_profile(path)


if __name__ == "__main__":
    unittest.main()
