# Mobile registration and verification feasibility

Research checked 21 September 2026. Recommendation for the current no-SMS, no-verification-service scope: **collect name and mobile number, optionally prefill from Android, and authenticate the saved player with a device credential. Store the mobile number as self-declared.** This is a proposed adjustment to the requested phone-verification requirement, not a claim that verification is already solved.

## What devices can support

| Approach                                 | Feasible?                                                            | What it establishes                                                                |
| ---------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Android Phone Number Hint                | Yes, when a usable SIM number and Google Play services are available | Convenient number selection; no ownership proof for the backend                    |
| Android telephony number APIs            | Availability varies; permission and carrier constraints apply        | A reported number whose accuracy is not guaranteed                                 |
| iOS cellular-plan status hints           | Investigate on the minimum supported OS and real devices             | A plan-presence/confidence signal; not a universal phone-authentication credential |
| Device passcode or biometrics            | Can protect local access                                             | Access to this device, not ownership of a mobile number                            |
| Android carrier verification without SMS | Possible through a supported online provider/carrier                 | A signed verification response that the server must validate                       |
| Manual number entry plus device sign-in  | Feasible across targets                                              | Registered player profile with an unverified phone attribute                       |

Android's [Phone Number Hint](https://developer.android.com/identity/phone-number-hint) presents a consent-based number picker without an additional permission request. Handle cancellation, no number, dual SIM and unavailable Play services with manual entry.

The [SubscriptionManager documentation](https://developer.android.com/reference/android/telephony/SubscriptionManager) explicitly cautions that source/network availability and correctness vary and further verification is necessary for sensitive uses. Therefore a client reporting a SIM number must not grant access to an existing phone-number account.

Apple documents [CTCellularPlanStatus](https://developer.apple.com/documentation/coretelephony/ctcellularplanstatus) plan hints with permission and confidence information. Some surfaced documentation marks these APIs beta; OS availability needs a native feasibility spike. Its UPI validation path requires a special entitlement and SMS, so it is not a general solution for this game's proposed flow. The safe cross-platform baseline is manual entry, without a verified badge.

[Firebase Phone Number Verification](https://firebase.google.com/docs/phone-number-verification) offers Android carrier-based verification without SMS, with consent and a signed token checked by the backend. It depends on supported devices/carriers and an online service. Production onboarding and billing are required; [pricing](https://firebase.google.com/docs/phone-number-verification/pricing) is separate from merely reading the SIM. Target-country/carrier coverage must be confirmed before choosing this path. No provider was enabled or purchased during this work.

## Proposed v1 flow represented in the images

1. Register a player with display name, country code and normalized mobile number.
2. Optionally choose a suggested Android SIM number. Treat that result as unverified.
3. Issue an independent, high-entropy device credential and server session. Use an opaque player ID; never use the mobile number as a bearer credential.
4. Save the credential securely on native devices. “Continue as Priya” uses the existing credential.
5. Offer a separately generated recovery secret; store only its hash server-side. The mockup's XXXX groups are placeholders, not the entropy/format specification.
6. Restoring a profile proves possession of the recovery secret, rotates it, revokes old device sessions by default and issues a new session. Do not retrieve an existing profile just because the user re-enters its number.
7. Preserve existing username/password accounts. An authenticated existing user can add name and mobile to the same profile; never merge accounts by an unverified phone match.
8. Before joining a private table, explain that other admitted members can see the name, shared mobile number and live ticket. Record acknowledgement for that table.

Store normalized number, input source (manual or SIM hint), verification status, optional verification time/method, and disclosure acknowledgement. A SIM hint must not set a verified flag. Unverified phone numbers should not have a global uniqueness constraint or be used for account recovery/search.

This model meets mobile **registration** and authenticated online play, but cannot promise verified phone ownership or one human per profile. If verified ownership is mandatory, select an online proof mechanism and revise screens 03 and 21–23. With the stated no-SMS requirement, unsupported carrier/device combinations need either the self-declared fallback or a clear unsupported state.

## Small feasibility spike before implementation

Build an Expo native development module for Android Phone Number Hint, test on actual single-SIM, dual-SIM, eSIM, no-SIM and Play-services-unavailable devices, and check the app's current minimum OS. Browser builds use manual entry. Test iOS separately; do not infer native API support from the web mockups. If carrier verification is chosen, validate token signature, audience, expiry and request binding on the server and test supported and unsupported carriers.
