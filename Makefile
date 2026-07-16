.PHONY: dev build lint check tauri-dev tauri-build tauri-deb tauri-rpm tauri-appimage tauri-all tauri-build-win clean pkg flatpak bench bench-decode bench-alloc bench-iai bench-all

dev:
	bun run dev

build:
	bun run build

lint:
	bun run lint
	
check:
	cd src-tauri && cargo check

tauri-dev:
	bun run tauri dev

tauri-build:
	bun run tauri build

tauri-build-win:
	@echo "=== Build para Windows (cross-compilation Linux → Windows) ==="
	@echo ""
	@echo "[1/3] Verificando dependências..."
	@command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1 || { echo "Erro: mingw-w64 não instalado. Instale com:"; echo "  sudo pacman -S mingw-w64-gcc"; exit 1; }
	@rustup target list --installed | grep -q x86_64-pc-windows-gnu || rustup target add x86_64-pc-windows-gnu
	@echo "✔ Dependências OK"
	@echo ""
	@echo "[2/3] Compilando para Windows..."
	bun run tauri build -- --no-bundle --target x86_64-pc-windows-gnu
	$(eval VER = $(shell grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/'))
	@echo ""
	@echo "[3/3] Empacotando .zip..."
	cd src-tauri/target/x86_64-pc-windows-gnu/release && \
	  7z a -tzip "$$OLDPWD/Aether-$(VER)-windows-x86_64-portable.zip" \
	    Aether.exe WebView2Loader.dll 2>/dev/null || \
	  zip "$$OLDPWD/Aether-$(VER)-windows-x86_64-portable.zip" \
	    Aether.exe WebView2Loader.dll 2>/dev/null || \
	  echo "⚠  WebView2Loader.dll não encontrada — zip apenas com Aether.exe"
	@ls -lh Aether-*.zip 2>/dev/null
	mkdir -p pacotes
	mv Aether-*.zip pacotes/ 2>/dev/null || true
	@ls -lh pacotes/Aether-*.zip 2>/dev/null

tauri-deb:
	bun run tauri build -- --bundles deb
	mkdir -p pacotes
	mv src-tauri/target/release/bundle/deb/*.deb pacotes/ 2>/dev/null || true
	@ls -lh pacotes/*.deb 2>/dev/null

tauri-rpm:
	bun run tauri build -- --bundles rpm
	mkdir -p pacotes
	mv src-tauri/target/release/bundle/rpm/*.rpm pacotes/ 2>/dev/null || true
	@ls -lh pacotes/*.rpm 2>/dev/null

tauri-appimage:
	-bun run tauri build -- --bundles appimage
	APPIMAGE_EXTRACT_AND_RUN=1 $$HOME/.cache/tauri/linuxdeploy-plugin-appimage.AppImage \
	  --appdir src-tauri/target/release/bundle/appimage/Aether.AppDir
	$(eval VER = $(shell grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/'))
	mkdir -p pacotes
	mv Aether-*.AppImage pacotes/Aether-$(VER)-x86_64.AppImage 2>/dev/null || true
	@ls -lh pacotes/Aether-*.AppImage 2>/dev/null

tauri-all:
	bun run tauri build -- --bundles deb,rpm
	-bun run tauri build -- --bundles appimage
	APPIMAGE_EXTRACT_AND_RUN=1 $$HOME/.cache/tauri/linuxdeploy-plugin-appimage.AppImage \
	  --appdir src-tauri/target/release/bundle/appimage/Aether.AppDir
	$(eval VER = $(shell grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/'))
	mkdir -p pacotes
	mv src-tauri/target/release/bundle/deb/*.deb pacotes/ 2>/dev/null || true
	mv src-tauri/target/release/bundle/rpm/*.rpm pacotes/ 2>/dev/null || true
	mv Aether-*.AppImage pacotes/Aether-$(VER)-x86_64.AppImage 2>/dev/null || true
	@ls -lh pacotes/

clean:
	rm -rf dist src-tauri/target node_modules pacotes flatpak/build-dir flatpak/repo && bun install

pkg:
	cd arch-linux && BUILDDIR=/tmp/aether-build makepkg -C -f -c
	@for f in arch-linux/Aether-*.pkg.tar.zst; do \
	  base=$${f%.pkg.tar.zst}; \
	  mv "$$f" "$$base.pacman"; \
	done
	mkdir -p pacotes
	mv arch-linux/Aether-*.pacman pacotes/ 2>/dev/null || true
	@ls -lh pacotes/Aether-*.pacman

flatpak:
	@command -v flatpak-builder >/dev/null 2>&1 || { echo "❌ flatpak-builder não encontrado. Instale com: sudo pacman -S flatpak-builder"; exit 1; }
	@command -v flatpak >/dev/null 2>&1 || { echo "❌ flatpak não encontrado"; exit 1; }
	@flatpak info org.freedesktop.Platform//25.08 >/dev/null 2>&1 || { echo "❌ Runtime org.freedesktop.Platform//25.08 não instalado. Instale com: flatpak install flathub org.freedesktop.Platform//25.08 org.freedesktop.Sdk//25.08"; exit 1; }
	@flatpak info org.freedesktop.Sdk//25.08 >/dev/null 2>&1 || { echo "❌ SDK org.freedesktop.Sdk//25.08 não instalado"; exit 1; }
	ls src-tauri/target/release/Aether >/dev/null 2>&1 || bun run tauri build -- --no-bundle
	cd flatpak && flatpak-builder --force-clean build-dir com.aether.app.yml
	flatpak build-export flatpak/repo flatpak/build-dir
	flatpak build-bundle flatpak/repo Aether.flatpak com.aether.app
	$(eval VER = $(shell grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)",/\1/'))
	mkdir -p pacotes
	mv Aether.flatpak pacotes/Aether-$(VER).flatpak 2>/dev/null || true
	@ls -lh pacotes/Aether-*.flatpak 2>/dev/null
