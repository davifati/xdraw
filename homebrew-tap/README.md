# homebrew-xdraw

Homebrew tap for xDraw — architecture drawing tool based on Excalidraw.

## Install

```sh
brew tap YOUR_USERNAME/xdraw
brew install --cask xdraw
```

## Publish a new release

1. Build the DMG:
   ```sh
   ./scripts/build-desktop.sh
   ```

2. Create a GitHub release and upload `dist-electron/xDraw-*-universal.dmg`.

3. Get the SHA256 of the DMG:
   ```sh
   shasum -a 256 dist-electron/xDraw-*-universal.dmg
   ```

4. Update `Casks/xdraw.rb`:
   - Set `version` to the new version
   - Set `sha256` to the hash from step 3
   - Update the `url` if needed

5. Commit and push to this tap repository.

Users running `brew upgrade xdraw` will get the new version automatically.
