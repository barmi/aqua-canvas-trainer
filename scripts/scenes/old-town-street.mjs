// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "old-town-street",
  "indoor": false,
  "wash": "#f0e3ce",
  "regions": [
    {
      "id": "sky",
      "label": "골목 위 하늘",
      "material": "other",
      "shape": "<path d=\"M55 55H945V705H55Z\"/>",
      "wash": "#e3e9ed"
    },
    {
      "id": "road",
      "label": "골목길",
      "material": "stone",
      "shape": "<path d=\"M448 325H582L945 705H55Z\"/>",
      "wash": "#e8d9bd"
    },
    {
      "id": "left-buildings",
      "label": "왼쪽 건물",
      "material": "stone",
      "shape": "<path d=\"M55 180L213 74L381 205V586L55 705Z M381 274L454 233V506L381 586Z\"/>",
      "wash": "#e6c8a6"
    },
    {
      "id": "right-buildings",
      "label": "오른쪽 건물",
      "material": "stone",
      "shape": "<path d=\"M615 210L793 106L945 183V705L615 571Z M571 287L615 265V571L571 508Z\"/>",
      "wash": "#e2d3b7"
    },
    {
      "id": "plants",
      "label": "골목의 화분",
      "material": "foliage",
      "shape": "<g transform=\"translate(181 581) scale(0.65)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g><g transform=\"translate(795 576) scale(0.75)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g>",
      "wash": "#d1d8b3"
    }
  ],
  "details": "<path d=\"M55 180L213 74L381 205 M71 185L213 93L366 207 M213 94V636 M615 210L793 106L945 183 M793 107V644 M86 270L174 218V338L86 382Z M106 258V371 M86 325L174 279 M244 232L335 269V369L244 344Z M290 251V357 M244 287L335 321 M88 442L171 406V607L88 637Z M108 447L150 430V600L108 614Z M653 266L754 227V357L653 375Z M703 247V366 M653 323L754 293 M822 252L901 281V388L822 369Z M861 268V378 M822 312L901 336 M651 439L750 420V589L651 555Z M672 446L727 437V571L672 552Z M411 297V359L438 347V286Z M589 324V373L608 382V315Z M444 566L601 571 M363 626L664 638 M224 692L777 691 M427 587L385 623 M512 572L518 635 M585 611L627 690 M328 655L287 693\"/>",
  "shadows": {
    "upper-left": "<path d=\"M381 586L454 506L615 583L536 654Z M55 705L213 636L344 705Z\"/>",
    "upper-right": "<path d=\"M571 508L615 571L463 641L421 580Z M793 644L945 705H664Z\"/>",
    "left": "<path d=\"M381 586L454 506L690 574L616 662Z M55 705L213 636L452 705Z\"/>",
    "right": "<path d=\"M571 508L615 571L346 657L306 584Z M793 644L945 705H551Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M381 586L454 506L792 705H592Z M55 705L213 636L512 705Z\"/>",
    "upper-right": "<path d=\"M571 508L615 571L323 705H169Z M793 644L945 705H469Z\"/>",
    "left": "<path d=\"M381 586L454 506L851 642L796 705H667Z M55 705L213 636L594 705Z\"/>",
    "right": "<path d=\"M571 508L615 571L179 705H55V646Z M793 644L945 705H381Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M213 94L381 205V586L213 636Z M793 107L945 183V705L793 644Z\"/>",
    "right": "<path d=\"M55 180L213 94V636L55 705Z M615 210L793 107V644L615 571Z\"/>"
  }
}
