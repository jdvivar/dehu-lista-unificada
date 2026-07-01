# Changelog

## [0.3.1-beta.1](https://github.com/jdvivar/dehu-lista-unificada/compare/dehu-unificado-v0.3.0-beta.1...dehu-unificado-v0.3.1-beta.1) (2026-07-01)


### Bug Fixes

* drop unused scripting permission ([558d4df](https://github.com/jdvivar/dehu-lista-unificada/commit/558d4dfc18e28d6f7f60074ed80c4a2b3c03185b))

## [0.3.0-beta.1](https://github.com/jdvivar/dehu-lista-unificada/compare/dehu-unificado-v0.2.1-beta.1...dehu-unificado-v0.3.0-beta.1) (2026-06-30)


### Features

* hexagon brand icon for the extension ([afe1935](https://github.com/jdvivar/dehu-lista-unificada/commit/afe1935d9be246ecabd036944a7babac642f382e))

## [0.2.1-beta.1](https://github.com/jdvivar/dehu-lista-unificada/compare/dehu-unificado-v0.2.0-beta.1...dehu-unificado-v0.2.1-beta.1) (2026-06-30)


### Bug Fixes

* drop the GitHub link from the bar (feedback link is enough) ([28a2879](https://github.com/jdvivar/dehu-lista-unificada/commit/28a2879d0297a9c2489bce280f0f4b1067eb23eb))

## [0.2.0-beta.1](https://github.com/jdvivar/dehu-lista-unificada/compare/dehu-unificado-v0.1.0-beta.1...dehu-unificado-v0.2.0-beta.1) (2026-06-30)


### Features

* BETA label, GitHub link, and a pre-filled feedback link in the overlay ([bbe6692](https://github.com/jdvivar/dehu-lista-unificada/commit/bbe6692c9b5e5600fb9b1ff8072b1a7a6f60f4b4))
* deep-link items to their detail pages, honoring the page language ([382a63f](https://github.com/jdvivar/dehu-lista-unificada/commit/382a63fd392e72902a363831cc1a16adff00881a))
* incremental sync — cache history, only re-fetch the 30-day doubt window ([0200e45](https://github.com/jdvivar/dehu-lista-unificada/commit/0200e4504c3258974c0797e9da97461630fa24c2))


### Bug Fixes

* derive storage identity from the SPA user request instead of a 404ing call ([535b318](https://github.com/jdvivar/dehu-lista-unificada/commit/535b318e7d408144f3508518bd30f6a02508b0f6))
* hide launcher on public/login routes and re-check on SPA navigation ([0b00ecc](https://github.com/jdvivar/dehu-lista-unificada/commit/0b00ecc1379f9f51b0eb3247b512c1479ab699a8))
* link each row to the correct DEHu tab by type ([ab5bb5a](https://github.com/jdvivar/dehu-lista-unificada/commit/ab5bb5ab792f72ad441c3872e1385e98652e5868))
* make the floating launcher draggable with remembered position ([41c59fd](https://github.com/jdvivar/dehu-lista-unificada/commit/41c59fde3e53731e704318d3146ce393e0c79780))
* only show the launcher once logged in (token-gated, document_start hook) ([b2adbe5](https://github.com/jdvivar/dehu-lista-unificada/commit/b2adbe5cb797e4f38ad52a56dab39eb96a54b9e0))

## 0.1.0-beta.1 (2026-06-29)


### Miscellaneous Chores

* bootstrap initial beta release ([cc99eb1](https://github.com/jdvivar/dehu-lista-unificada/commit/cc99eb131a476ae716432a57245d7a86154cb6f0))

## Changelog

All notable changes to this project are documented in this file. This project
adheres to [Semantic Versioning](https://semver.org) and the changelog is
maintained automatically by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org).

Releases remain in **beta** (pre-release) until the extension is verified
against the live DEHú site.
