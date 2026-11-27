import unittest

from zero_router.jobs import JobManifest
from zero_router.policy import Classification, Engine, Operation


class JobManifestTests(unittest.TestCase):
    def test_round_trip_preserves_private_defaults(self):
        manifest = JobManifest.from_dict({
            "schema_version": 1,
            "job_id": "job-001",
            "operation": "image_upscaling",
            "input_media": ["asset://source-1"],
        })
        self.assertEqual(manifest.classification, Classification.PRIVATE)
        self.assertFalse(manifest.cloud_consent)
        self.assertEqual(JobManifest.from_dict(manifest.to_dict()), manifest)

    def test_cloud_consent_must_be_boolean(self):
        with self.assertRaisesRegex(ValueError, "cloud_consent"):
            JobManifest.from_dict({
                "schema_version": 1, "job_id": "job-002",
                "operation": "image_generation", "cloud_consent": "yes",
            })

    def test_unknown_operation_is_rejected(self):
        with self.assertRaises(ValueError):
            JobManifest.from_dict({
                "schema_version": 1, "job_id": "job-003",
                "operation": "magic_edit",
            })

    def test_missing_job_id_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "job_id"):
            JobManifest.from_dict({"schema_version": 1, "operation": "color_adjustment"})

    def test_requested_engine_is_parsed(self):
        manifest = JobManifest.from_dict({
            "schema_version": 1, "job_id": "job-004",
            "operation": "color_adjustment", "requested_engine": "private_local",
        })
        self.assertEqual(manifest.requested_engine, Engine.PRIVATE_LOCAL)


if __name__ == "__main__":
    unittest.main()
