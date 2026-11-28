# Billedstil: Sodavands-maskinen (Variant A — Sago-klassisk)

Denne fil fastlægger billedstilen for **Sodavands-maskinen** (og evt. kommende spil i samme univers), så nye karakterer, udtryk og rekvisitter matcher **Variant A** 100 %.

## Stilreferencer
- `billeder/sodavand/kat-idle.webp` — koral-orange kat med skævt øre, stribet mint-halstørklæde og krøllet hale
- `billeder/sodavand/hund-idle.webp` — varm karamel-hund med ét løftet øre, rødt prikket tørklæde og lille tunge ude af siden

## Kendetegn ved stilen
- **Linjeløs ("lineless") billedbogsstil** — ingen tunge sorte/brune konturstreger; rene, bløde flader med let mat papir-tekstur.
- **Enkle geometriske former** — pære- eller bønneformede kroppe, små buttede poter/ben.
- **Let fjollet charme ("goofy", ikke overdrevet)** — diskret asymmetri: ét skævt/løftet øre, bredt placerede runde sorte prik-øjne, skævt smil eller lille lyserød tunge, en farverig detalje (halstørklæde, tørklæde, hat el.lign.).
- **Ren baggrund til udskæring** — altid centreret med god luft omkring på helt ensfarvet `#FFFFFF` uden skygge, gulv eller tekst.

---

## Grund-prompt til nye karakterer / rekvisitter

```text
Generate a cute, slightly goofy children's app character illustration of [MOTIV, fx "a quirky mint-green frog with a tiny yellow crown"] in classic Sago Mini flat picture-book style (simple bold geometric shapes, soft flat warm pastel colors with subtle matte paper texture, NO dark outlines—clean crisp lineless edges). Give it gentle goofy charm without overdoing it: [SKÆV DETALJE, fx "a slightly pear-shaped plump body, wide-set playful black dot eyes, a cheeky crooked little smile, tiny stubby paws, and a fun colorful accessory"]. Facing forward, centered with generous padding, on a completely solid pure white (#FFFFFF) background with no shadow, no floor, no text, and no other objects.
```

## Prompt-skabelon til ansigtsudtryk (redigering af eksisterende sprite)

Læg original-spriten centreret på ren `#FFFFFF` baggrund og brug:

- **Drikker (`-drink.webp`):**
  ```text
  Edit this exact character to show a happy DRINKING / GULPING expression. Keep the exact same character, lineless flat paper-cut style, body position, silhouette, colors, and pure white (#FFFFFF) background—ONLY change the face: make the eyes happy closed curved arcs (^ ^) and open the mouth wide in a cute round open "O" mouth ready to drink/gulp (showing a little pink tongue inside). No glass, no straw, no text, no shadow.
  ```

- **Sur grimasse (`-sour.webp`):**
  ```text
  Edit this exact character making a hilarious SOUR / SILLY FACE after tasting something super sour! Keep the exact same character, lineless flat paper-cut style, body position, silhouette, colors, and pure white (#FFFFFF) background—ONLY change the face: squeeze both eyes tightly shut in comical "> <" squints, scrunch the cheeks slightly, and make a funny puckered wavy sour mouth. No text, no shadow, no extra objects.
  ```

## Efterbehandling
- Fjern udvendig hvid baggrund med flood-fill fra kanterne (så lyse/hvide prikker på tørklæder m.m. bevares).
- Beskær alle udtryk for samme karakter med **præcis samme bounding box** som `-idle.webp`, så skift mellem poser aldrig hopper.
- Gem sprites som WebP (maks. 512×512 px, kvalitet `0.92`).
- **Fuldskærms-baggrunde (`bg-*.webp`):** Skal altid genereres i **ægte 4K** (fx `imageSize: "4K"`, `aspectRatio: "16:9"`, mindst ~3840 px bredde) og gemmes som WebP (kvalitet `0.90–0.92`) uden nedskalering.
