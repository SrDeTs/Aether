pkgname=Aether
pkgver=0.2.3
pkgrel=0
pkgdesc="Jellyfin Player Music"
arch=('x86_64')
url="https://github.com/SrDeTs/Aether"
license=('MIT')
depends=('' '' '')
source=("Aether.desktop" "Aether.png")
sha256sums=('SKIP' 'SKIP')

package() {
  local _builddir="/home/michael/Criar Apps/Aether/Arch Linux"
  
  mkdir -p "${pkgdir}/usr/bin"
  mkdir -p "${pkgdir}/usr/share/applications"
  mkdir -p "${pkgdir}/usr/share/icons/hicolor/256x256/apps"
  
  cp -r "${_builddir}"/* "${pkgdir}/usr/bin/"
  
  install -Dm644 "${srcdir}/Aether.desktop" "${pkgdir}/usr/share/applications/Aether.desktop"
  install -Dm644 "${srcdir}/Aether.png" "${pkgdir}/usr/share/icons/hicolor/256x256/apps/Aether.png"
}
