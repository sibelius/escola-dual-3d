# Dual City — Escola Dual 3D

Jogo 3D estilo GTA de um dia na Escola Dual (Itacorubi, Florianópolis).

- **Mapa**: contorno do lote, os 3 prédios e as ruas vieram do OpenStreetMap (`js/osm.js`, © OSM contributors, ODbL), escala 1.4×.
- **Engine**: Three.js via CDN, sem build. Rodar: `python3 -m http.server 5178` e abrir http://localhost:5178
- **Personagens**: Lulu (1º ano Infantil), Pedro (3º EM), Profª Ana, Seu Zé (zelador), cada um com suas missões.
- **Controles**: WASD, Shift correr, Espaço pular, E interagir, J piada, F patinete, mouse gira câmera, scroll zoom.

Arquivos: `js/world.js` (cenário), `js/people.js` (personagens/NPCs), `js/games.js` (mini-games), `js/main.js` (loop, física, missões, HUD).
