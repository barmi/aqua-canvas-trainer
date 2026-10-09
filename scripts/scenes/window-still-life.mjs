// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "window-still-life",
  "indoor": true,
  "wash": "#f5ead5",
  "regions": [
    {
      "id": "wall",
      "label": "벽과 창문",
      "material": "stone",
      "shape": "<path d=\"M55 55H945V425H55Z\"/>",
      "wash": "#e4eee8"
    },
    {
      "id": "table",
      "label": "나무 테이블",
      "material": "wood",
      "shape": "<path d=\"M55 425H945V705H55Z\"/>",
      "wash": "#ead9be"
    },
    {
      "id": "cloth",
      "label": "접힌 천",
      "material": "fabric",
      "shape": "<path d=\"M250 420Q410 387 573 430L703 630Q503 673 282 625L184 481Z\"/>",
      "wash": "#efdfd3"
    },
    {
      "id": "cup",
      "label": "컵과 접시",
      "material": "ceramic",
      "shape": "<ellipse cx=\"417\" cy=\"505\" rx=\"112\" ry=\"30\"/><path d=\"M357 410Q417 390 477 410L464 481Q417 515 370 480Z M477 421Q523 406 519 445Q514 469 473 463\"/><ellipse cx=\"417\" cy=\"410\" rx=\"60\" ry=\"15\"/>",
      "wash": "#f1edda"
    },
    {
      "id": "plants",
      "label": "창가 화분",
      "material": "foliage",
      "shape": "<g transform=\"translate(699 373) scale(1.45)\">\n  <path d=\"M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121\"/>\n  <ellipse cx=\"-36\" cy=\"-83\" rx=\"17\" ry=\"32\" transform=\"rotate(-40 -36 -83)\"/>\n  <ellipse cx=\"35\" cy=\"-111\" rx=\"17\" ry=\"32\" transform=\"rotate(38 35 -111)\"/>\n  <ellipse cx=\"-22\" cy=\"-126\" rx=\"14\" ry=\"30\" transform=\"rotate(-27 -22 -126)\"/>\n  <ellipse cx=\"8\" cy=\"-147\" rx=\"15\" ry=\"32\" transform=\"rotate(13 8 -147)\"/>\n  <path d=\"M-33 5Q0 13 33 5 M-17 15L-13 49\"/>\n</g>",
      "wash": "#ccdcbf"
    }
  ],
  "details": "<path d=\"M110 65H849V359H110Z M135 86H824V334H135Z M480 86V334 M135 210H824 M85 359H876V379H85Z M55 425H945 M55 593H230 M740 593H945 M318 441Q358 488 314 588 M574 467L629 604 M365 414Q419 431 469 414\"/><ellipse cx=\"417\" cy=\"410\" rx=\"48\" ry=\"10\"/>",
  "shadows": {
    "upper-left": "<path d=\"M378 494Q455 471 481 496L614 585Q525 619 459 585Z M663 453Q708 470 740 451L865 535Q794 564 744 528Z\"/>",
    "upper-right": "<path d=\"M375 492Q432 480 469 496L330 587Q254 600 224 566Z M661 452L736 454L589 547L514 525Z\"/>",
    "left": "<path d=\"M379 494L467 493L674 535L601 552Z M663 453L734 453L938 496L861 515Z\"/>",
    "right": "<path d=\"M379 494L467 493L254 549L159 532Z M663 453L734 453L514 510L443 488Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M449 423L474 416L462 479Q451 490 438 493Z M701 375H742L731 460L701 472Z\"/>",
    "right": "<path d=\"M359 416L384 422L392 492Q380 486 370 478Z M655 375H694L696 472L665 460Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M378 494L481 496L728 659L626 692Z M663 453L740 451L945 624V688L744 528Z\"/>",
    "upper-right": "<path d=\"M375 492L469 496L189 687L65 652Z M661 452L736 454L425 656L343 628Z\"/>",
    "left": "<path d=\"M379 494L467 493L875 589L801 617Z M663 453L734 453L945 495V555L861 515Z\"/>",
    "right": "<path d=\"M379 494L467 493L55 597V551Z M663 453L734 453L298 572L221 549Z\"/>"
  }
}
