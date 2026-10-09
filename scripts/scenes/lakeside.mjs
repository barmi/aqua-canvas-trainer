// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "lakeside",
  "indoor": false,
  "wash": "#e6edf0",
  "regions": [
    {
      "id": "sky",
      "label": "하늘",
      "material": "other",
      "shape": "<path d=\"M55 55H945V343H55Z\"/>",
      "wash": "#dfe9eb"
    },
    {
      "id": "mountains",
      "label": "먼 산",
      "material": "stone",
      "shape": "<path d=\"M55 341L195 197L277 285L405 167L528 302L652 230L786 318L945 222V400H55Z\"/>",
      "wash": "#ccd7d1"
    },
    {
      "id": "water",
      "label": "호수의 수면",
      "material": "water",
      "shape": "<path d=\"M55 371Q432 335 945 363V705H55Z\"/>",
      "wash": "#d3e5e6"
    },
    {
      "id": "shore",
      "label": "앞쪽 물가",
      "material": "stone",
      "shape": "<path d=\"M55 579Q245 529 367 600Q488 652 621 705H55Z\"/>",
      "wash": "#dfd6b7"
    },
    {
      "id": "tree",
      "label": "물가의 나무",
      "material": "foliage",
      "shape": "<path d=\"M169 601L185 340L196 598Z M97 396Q44 370 85 319Q43 269 104 240Q99 170 168 191Q197 140 239 197Q312 179 308 245Q367 273 326 315Q358 374 293 390Q236 430 193 393Q151 439 97 396Z\"/>",
      "wash": "#c8d6ac"
    }
  ],
  "details": "<path d=\"M175 531L160 388L122 303 M178 472L226 357L270 285 M178 428L191 279 M55 371Q437 332 945 363 M342 413H550 M676 399H831 M442 459H756 M718 511H918 M362 547H541 M552 590H821 M710 649H904 M387 628Q455 601 500 643 M122 630Q156 605 190 635 M227 661Q263 633 307 667 M407 168L424 264L464 246 M194 198L209 282L248 262\"/>",
  "shadows": {
    "upper-left": "<path d=\"M176 599L202 594L463 680L421 704L315 679Z M97 395Q188 450 285 395L395 468Q240 493 137 438Z\"/>",
    "upper-right": "<path d=\"M177 599L202 600L122 703H55V676Z M97 395Q187 449 285 395L233 478Q129 487 69 435Z\"/>",
    "left": "<path d=\"M175 598L202 597L525 635L465 660Z M196 199L277 285L226 295L207 257Z M405 168L528 302L463 286L424 230Z\"/>",
    "right": "<path d=\"M175 598L202 597L55 656V626Z M195 199L115 281L161 282L193 251Z M405 168L297 272L353 281L402 229Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M405 168L528 302L462 289L423 232Z M652 230L786 318L715 304Z M188 347L197 597H184Z\"/>",
    "right": "<path d=\"M405 168L277 285L355 279L400 223Z M652 230L572 291L621 286Z M171 601L182 346L187 599Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M176 599L202 594L596 705H454L315 679Z M97 395L285 395L565 532Q369 589 137 438Z\"/>",
    "upper-right": "<path d=\"M177 599L202 600L100 705H55V650Z M97 395L285 395L195 570Q89 580 55 480V430Z\"/>",
    "left": "<path d=\"M175 598L202 597L745 665L665 705Z M405 168L528 302L463 286L424 230Z\"/>",
    "right": "<path d=\"M175 598L202 597L55 687V626Z M405 168L297 272L353 281L402 229Z\"/>"
  }
}
