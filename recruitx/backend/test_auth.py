import asyncio
import unittest

from fastapi import HTTPException

import api.auth as auth


class AuthGuardTests(unittest.TestCase):
    def test_missing_token_is_rejected_by_default(self):
        original = auth.ALLOW_DEV_AUTH_BYPASS
        auth.ALLOW_DEV_AUTH_BYPASS = False
        try:
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(auth.get_current_user(None))
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            auth.ALLOW_DEV_AUTH_BYPASS = original

    def test_profile_owner_allows_matching_user_id(self):
        auth.assert_profile_owner("user-123", {"id": "user-123"})

    def test_profile_owner_rejects_other_user(self):
        with self.assertRaises(HTTPException) as ctx:
            auth.assert_profile_owner("profile-owner", {"id": "other-user"})
        self.assertEqual(ctx.exception.status_code, 403)

    def test_explicit_dev_bypass_allows_mock_user(self):
        original = auth.ALLOW_DEV_AUTH_BYPASS
        auth.ALLOW_DEV_AUTH_BYPASS = True
        try:
            auth.assert_profile_owner("any-profile", {"id": "mock-developer-id"})
            auth.assert_negotiation_participant(
                "any-recruiter", "any-candidate", {"id": "mock-developer-id"}
            )
        finally:
            auth.ALLOW_DEV_AUTH_BYPASS = original


if __name__ == "__main__":
    unittest.main()
