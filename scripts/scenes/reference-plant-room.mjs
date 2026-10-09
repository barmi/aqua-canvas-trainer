// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "reference-plant-room",
  "indoor": true,
  "wash": "#f6e9aa",
  "regions": [
    {
      "id": "wall",
      "label": "벽과 창가",
      "material": "stone",
      "shape": "<path d=\"M55 55H945V425L55 510Z\"/>",
      "wash": "#f8edc6"
    },
    {
      "id": "floor",
      "label": "바닥",
      "material": "wood",
      "shape": "<path d=\"M55 510L945 425V705H55Z\"/>",
      "wash": "#ead4a1"
    },
    {
      "id": "plants",
      "label": "화분과 잎",
      "material": "foliage",
      "shape": "<g transform=\"translate(150 365) scale(1.2)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g><g transform=\"translate(260 350) scale(0.8)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g><g transform=\"translate(850 390) scale(1.3)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g>",
      "wash": "#d5dbaf"
    },
    {
      "id": "chairs",
      "label": "천 의자",
      "material": "fabric",
      "shape": "<g transform=\"translate(340 420) scale(0.95)\">\n  <path d=\"M0 0Q80-25 157 0L148 120Q73 145 7 120Z M9 120L-5 153Q70 183 157 153L148 120 M0-5L-15 247 M158-5L178 247 M-25 99L176 99 M-25 109L176 109 M-12 160L169 245 M157 160L-4 245 M-26 97L-24 168 M176 97L180 168 M12 12Q79-8 144 13 M15 23Q79 5 141 25 M28 126Q77 141 132 128\"/>\n</g><g transform=\"translate(635 380) scale(0.95)\">\n  <path d=\"M0 0Q80-25 157 0L148 120Q73 145 7 120Z M9 120L-5 153Q70 183 157 153L148 120 M0-5L-15 247 M158-5L178 247 M-25 99L176 99 M-25 109L176 109 M-12 160L169 245 M157 160L-4 245 M-26 97L-24 168 M176 97L180 168 M12 12Q79-8 144 13 M15 23Q79 5 141 25 M28 126Q77 141 132 128\"/>\n</g>",
      "wash": "#f6e9aa"
    },
    {
      "id": "table",
      "label": "작은 테이블",
      "material": "wood",
      "shape": "<path d=\"M95 435L266 414L310 455L136 480Z M136 480V625 M282 462V592 M158 478L156 625 M265 467L264 595\"/>",
      "wash": "#e2c9a2"
    }
  ],
  "details": "<path d=\"M55 510L945 425 M410 55V378 M450 70H760V335H450Z M605 70V335 M450 190H760 M55 588L945 490 M55 675L945 565 M250 491L170 705 M500 466L505 705 M760 442L855 705\"/><ellipse cx=\"201\" cy=\"433\" rx=\"27\" ry=\"11\"/><path d=\"M176 433V406Q199 394 224 406V433 M224 408Q247 404 243 424Q239 433 225 427\"/>",
  "shadows": {
    "upper-left": "<path d=\"M346 560L500 575L607 693L452 665Z M643 527L798 531L912 650L755 632Z M137 480L161 490L250 625L222 625Z\"/>",
    "upper-right": "<path d=\"M347 560L496 565L361 690L210 667Z M644 527L794 535L653 658L502 631Z M136 481L160 484L92 622L65 612Z\"/>",
    "left": "<path d=\"M348 565L499 570L660 623L506 620Z M644 532L796 539L940 585L788 593Z\"/>",
    "right": "<path d=\"M348 565L498 570L264 630L116 608Z M644 532L796 539L565 605L414 587Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M480 423L488 526L465 534L465 421Z M776 384L777 488L755 496L754 382Z M852 389L882 389L873 468L850 473Z\"/>",
    "right": "<path d=\"M342 424L366 422L368 533L349 531Z M637 384L658 383L661 494L643 493Z M814 391L844 391L847 474L824 467Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M346 560L500 575L735 705H538L450 657Z M643 527L798 531L945 689L849 705L755 632Z\"/>",
    "upper-right": "<path d=\"M347 560L496 565L253 705H55L183 645Z M644 527L794 535L505 705L352 675Z\"/>",
    "left": "<path d=\"M348 565L499 570L893 678L738 700Z M644 532L796 539L945 589V660L788 593Z\"/>",
    "right": "<path d=\"M348 565L498 570L126 705H55V651Z M644 532L796 539L363 675L204 648Z\"/>"
  }
}
