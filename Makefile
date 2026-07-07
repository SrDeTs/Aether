.PHONY: dev build lint check tauri-dev tauri-build tauri-build-win clean pkg bench bench-decode bench-alloc bench-iai bench-all

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint
	
check:
	cd src-tauri && cargo check

tauri-dev:
	npm run tauri dev

tauri-build:
	npm run tauri build

tauri-build-win:
	@echo "=== Build para Windows (cross-compilation Linux → Windows) ==="
	@echo ""
	@echo "[1/3] Verificando dependências..."
	@command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1 || { echo "Erro: mingw-w64 não instalado. Instale com:"; echo "  sudo pacman -S mingw-w64-gcc"; exit 1; }
	@command -v makensis >/dev/null 2>&1 || { echo "Erro: NSIS não instalado. Instale com:"; echo "  yay -S nsis      # AUR"; echo "  # ou: paru -S nsis"; exit 1; }
	@rustup target list --installed | grep -q x86_64-pc-windows-gnu || rustup target add x86_64-pc-windows-gnu
	@echo "✔ Dependências OK"
	@echo ""
	@echo "[2/3] Build do backend Rust + bundle para Windows (NSIS)..."
	@echo "  Alvo: x86_64-pc-windows-gnu"
	@echo "  Saída esperada: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/"
	@echo ""
	@grep -q '"active": true' src-tauri/tauri.conf.json 2>/dev/null || echo "⚠  Aviso: bundle.active = false em tauri.conf.json — o Tauri não vai gerar o instalador .exe."
	@grep -q '"active": true' src-tauri/tauri.conf.json 2>/dev/null || echo "⚠  Para gerar o instalador, edite tauri.conf.json e defina \"bundle\".\"active\": true"
	@echo ""
	npm run tauri -- build --target x86_64-pc-windows-gnu
	@echo ""
	@echo "[3/3] Build concluído!"
	@ls -lh src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/*.exe 2>/dev/null || echo "Nenhum .exe encontrado — veja se bundle.active = true em tauri.conf.json"
	@echo ""
	@echo "Dica: Para builds reproduzíveis, use GitHub Actions com windows-latest."

clean:
	rm -rf dist src-tauri/target node_modules && npm install

pkg:
	cd arch-linux && BUILDDIR=/tmp/aether-build makepkg -C -f -c
	@for f in arch-linux/Aether-*.pkg.tar.zst; do \
	  base=$${f%.pkg.tar.zst}; \
	  mv "$$f" "$$base.pacman"; \
	done
	@ls arch-linux/Aether-*.pacman

bench:
	cd src-tauri && cargo bench --bench decode_bench

bench-alloc:
	cd src-tauri && cargo bench --bench allocation_bench

bench-iai:
	@echo "=== IAI-Callgrind (contagem de instruções) ==="
	@command -v valgrind >/dev/null 2>&1 || { echo "❌ Valgrind não encontrado. Instale com: sudo pacman -S valgrind"; exit 1; }
	cd src-tauri && cargo bench --bench iai_bench

bench-vins:
	cd src-tauri && cargo run --bin vins-cli -- bench

bench-all:
	@echo "=== 1/4: Timing (Divan) ==="
	cd src-tauri && cargo bench --bench decode_bench
	@echo ""
	@echo "=== 2/4: Alocações (dhat) ==="
	cd src-tauri && cargo bench --bench allocation_bench
	@echo ""
	@echo "=== 3/4: Instruções (IAI-Callgrind) ==="
	@command -v valgrind >/dev/null 2>&1 && cd src-tauri && cargo bench --bench iai_bench || echo "⚠  Pulado (Valgrind não instalado)"
	@echo ""
	@echo "=== 4/4: Validação CLI ==="
	cd src-tauri && cargo run --bin vins-cli -- bench
