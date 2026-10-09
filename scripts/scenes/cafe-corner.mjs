// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "cafe-corner",
  "indoor": true,
  "wash": "#eadcc6",
  "regions": [
    {
      "id": "wall",
      "label": "카페 벽과 창문",
      "material": "stone",
      "shape": "<path d=\"M55 55H945V440L55 495Z\"/>",
      "wash": "#e9e4cf"
    },
    {
      "id": "floor",
      "label": "카페 바닥",
      "material": "wood",
      "shape": "<path d=\"M55 495L945 440V705H55Z\"/>",
      "wash": "#e4cfb6"
    },
    {
      "id": "table",
      "label": "원형 테이블",
      "material": "wood",
      "shape": "<ellipse cx=\"505\" cy=\"445\" rx=\"151\" ry=\"38\"/><path d=\"M354 445V457Q505 504 656 457V445 M495 477L479 645H493L514 479 M514 479L551 644H567L532 477\"/>",
      "wash": "#dfbc91"
    },
    {
      "id": "chairs",
      "label": "카페 의자",
      "material": "fabric",
      "shape": "<g transform=\"translate(705 392) scale(0.76)\">\n  <path d=\"M0 0Q80-25 157 0L148 120Q73 145 7 120Z M9 120L-5 153Q70 183 157 153L148 120 M0-5L-15 247 M158-5L178 247 M-25 99L176 99 M-25 109L176 109 M-12 160L169 245 M157 160L-4 245 M-26 97L-24 168 M176 97L180 168 M12 12Q79-8 144 13 M15 23Q79 5 141 25 M28 126Q77 141 132 128\"/>\n</g><g transform=\"translate(233 419) scale(0.68)\">\n  <path d=\"M0 0Q80-25 157 0L148 120Q73 145 7 120Z M9 120L-5 153Q70 183 157 153L148 120 M0-5L-15 247 M158-5L178 247 M-25 99L176 99 M-25 109L176 109 M-12 160L169 245 M157 160L-4 245 M-26 97L-24 168 M176 97L180 168 M12 12Q79-8 144 13 M15 23Q79 5 141 25 M28 126Q77 141 132 128\"/>\n</g>",
      "wash": "#d2ddc4"
    },
    {
      "id": "plants",
      "label": "창가의 초록",
      "material": "foliage",
      "shape": "<g transform=\"translate(145 405) scale(1.3)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g><g transform=\"translate(870 385) scale(0.75)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g>",
      "wash": "#c4d3ae"
    },
    {
      "id": "lamp",
      "label": "펜던트 조명",
      "material": "other",
      "shape": "<path d=\"M629 55V184 M610 185H650L694 252Q630 277 566 252Z M567 252Q632 232 693 252\"/>",
      "wash": "#ead29b"
    }
  ],
  "details": "<path d=\"M200 113Q200 65 283 65Q365 65 365 113V345H200Z M221 120Q221 88 283 88Q345 88 345 120V325H221Z M283 88V325 M221 206H345 M400 165H484V271H400Z M411 177H473V258H411Z M55 495L945 440 M486 444V416Q511 402 538 416V444 M538 418Q562 409 561 430Q557 445 538 438\"/><ellipse cx=\"511\" cy=\"444\" rx=\"48\" ry=\"13\"/><ellipse cx=\"511\" cy=\"415\" rx=\"25\" ry=\"8\"/>",
  "shadows": {
    "upper-left": "<path d=\"M478 636L566 636L726 697H605Z M705 579L846 577L944 654L818 666Z\"/>",
    "upper-right": "<path d=\"M479 636L566 636L410 704H287Z M706 578L846 578L687 679L568 655Z\"/>",
    "left": "<path d=\"M478 636L566 636L825 677L732 697Z M705 579L846 577L945 603V643Z\"/>",
    "right": "<path d=\"M478 636L566 636L264 698L173 677Z M705 579L846 577L542 652L401 625Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M478 636L566 636L886 705H713Z M705 579L846 577L945 682V705H844Z\"/>",
    "upper-right": "<path d=\"M479 636L566 636L314 705H115Z M706 578L846 578L595 705H427Z\"/>",
    "left": "<path d=\"M478 636L566 636L945 695V705H853Z M705 579L846 577L945 603V694Z\"/>",
    "right": "<path d=\"M478 636L566 636L55 705V678Z M705 579L846 577L382 690L184 660Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M807 395L820 393L815 483L798 485Z M530 477H548L565 643H550Z\"/>",
    "right": "<path d=\"M707 394H724L727 486H712Z M495 479L511 479L493 643H480Z\"/>"
  }
}
