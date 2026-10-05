# Next native development slice

Recommendation as of 2026-10-05: React Native with Expo, Android first on this
Windows host, using an actual local development binary. Keep shared contracts
separate from native UI, storage and crypto. This is a proposed reversible choice;
no mobile project, dependency installation, OS toolchain or native binary was
created in this milestone. The browser PWA does not fulfill the native outcome.

Read-only preflight on this Windows host found no `java`, `adb` or `emulator`
command on PATH, and neither the standard Android Studio install nor the current
user's default Android SDK directory exists. A nonstandard install has not been
ruled out. The next stage must locate or arrange the Android toolchain before
claiming an emulator/device build; this milestone did not install it.

Expo documents local Android/iOS compilation, installation on an emulator/device
and Metro startup through `npx expo run:android` / `npx expo run:ios`. After that
initial build, JavaScript changes can use `npx expo start`. Android needs Android
Studio/SDK; iOS needs the Mac/Xcode toolchain. Local development does not require
choosing a paid cloud build service. See [Expo's local development guide](https://docs.expo.dev/guides/local-app-development/).

Before the next bounded implementation, inspect Node/package manager, Android
Studio/SDK/JDK and emulator/attached-device availability. Choose a development
app identifier, compatible Expo SDK and lock dependencies. Report missing OS
toolchains concretely; do not claim device verification from unit tests or a web
preview. Mac/Xcode access is a separate prerequisite for iOS verification.

First native scope: genuine native Capture fields, draft list, reviewed synthetic
Explore, revision-conflict comparison and JSON export/import. Start with the
shared in-process **fictional** service adapter; the desktop server's loopback
address is not the phone's localhost. Do not widen server binding/Host rules to
make a device reach it. A later approved development transport can connect the
same contract to a suitable API. Production identity/provider/data decisions
can be deferred while this native synthetic slice proceeds.

Supply `createContract({digest, byteLength})` to the shared engine. Candidate
native digest adapter:

```javascript
digest: text => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text)
```

Expo's [Crypto documentation](https://docs.expo.dev/versions/latest/sdk/crypto/)
specifies SHA digest strings and default hex output on Android/iOS/web. Add a
tested UTF-8 byte-length adapter (including emoji and malformed surrogates) and
verify CommonJS/Metro imports with the actual selected runtime. Browser/Node
golden Markdown/hash and no-host-global VM checks currently pass; this is not a
claim that a native runtime has been built or tested.

For restart persistence, evaluate [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
with transaction tests and explicit demo-only storage. A durable command outbox
must preserve one retry key/payload through timeout/restart; compare current
revision and retain unsent text on conflict. The current memory engine resets
its ledger, so it cannot promise durable retries across restart. Native storage
and outbox are separate work; do not silently persist engine internals as a
production database or put real records in an unencrypted demo.

Acceptance: produce a locally runnable development build and evidence on an
Android emulator/device; verify native controls/navigation, restart/export/import,
Unicode hash parity, revision conflict preservation and accessible phone layout.
Keep the responsive synthetic web preview available alongside the binary/source.
Record iOS testing separately. Only then proceed toward approved authenticated
sync, device data/key policy, signing ownership and distribution. New cloud
accounts, credential grants, real-data access and store publication still need
the owner's concrete decisions.
