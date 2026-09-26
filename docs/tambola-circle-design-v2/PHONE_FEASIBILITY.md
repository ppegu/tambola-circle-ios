# Tambola Circle — current device and phone registration

Updated 22 September 2026 · Version 1.1.2 · supersedes the original no-input iPhone requirement.

Android keeps the native Google Phone Number Hint picker. iPhone now accepts a mobile number typed by the user, including its country code. The iPhone flow is explicitly labelled self-entered / unverified and requires no SMS OTP. Both flows collect a display name and consent to share the name/number with table members. There is no recovery-code flow.

## Device record before an account

On app launch and foreground, native apps create or reuse a random app UUID and independently generated device credential in SecureStore. Basic device metadata is saved locally first, then synchronized to the authenticated device endpoint. Network failures do not prevent offline calling. Retries and later foregrounds reuse the same identity. Existing installations keep their credential and account when a UUID is added during upgrade.

D1 stores a device row before the player exists. Registration links that row to the player. Captured fields, access boundaries and identifier limitations are documented in [data handling](../DATA-HANDLING.md). The UUID is displayed only on the current user's account screen, not in the player list or table events.

## Platform behavior

| Platform                                   | Number entry                                | Number source            |
| ------------------------------------------ | ------------------------------------------- | ------------------------ |
| Android with an available native result    | User chooses the returned number            | device_selected          |
| iPhone/iPad                                | User types an international number          | manual_ios               |
| Android with no supported/available result | Honest unsupported state and offline caller | No registration fallback |
| Web                                        | Native device sign-in unavailable           | No registration fallback |

[Android Phone Number Hint](https://developer.android.com/identity/phone-number-hint) supplies the native chooser. It does not guarantee every SIM slot or number is available. iOS public telephony APIs do not supply the required general SIM-number picker; the user authorized manual input while another verification option is considered.

The app records the available [Android ID or iOS IDFV through Expo Application](https://docs.expo.dev/versions/latest/sdk/application/) as metadata, plus [basic Expo Device information](https://docs.expo.dev/versions/latest/sdk/device/). These platform identifiers may change after resets, reinstall scenarios or signing changes. No permanent hardware UUID is promised; no IMEI or advertising ID is collected.

## Authentication and account continuity

Neither number selection nor manual entry proves phone ownership. Both sources remain verification_status=unverified. The server uses the secret device credential, stores only its hash, and does not authenticate by mobile number, app UUID or platform identifier. Device metadata is self-reported and is not device attestation.

A second device reporting the same phone number receives no access to an existing account. Saved credentials restore the same account and ongoing tables. Cross-device/reinstall account recovery remains a separate future feature and is not inferred from identifiers.

## Validation

Tests cover concurrent first-use UUID creation, upgrading an existing credential/profile, local capture before network failure, retry with the same UUID, international number validation, bounded metadata, UUID ownership conflicts, idempotent registration, iPhone manual-source persistence and Android backward compatibility. Physical-device checks remain necessary for native Android chooser behavior, iPhone keyboard/autofill, and identifier availability across platform reinstall/reset scenarios.
