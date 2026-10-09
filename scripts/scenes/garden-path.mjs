// Legacy placeholder moved from scene-art.mjs. Replace with a detailed layered scene (see scripts/scene-svg.mjs contract).
export const scene = {
  "id": "garden-path",
  "indoor": false,
  "wash": "#e5e9ce",
  "regions": [
    {
      "id": "sky",
      "label": "나무 사이 하늘",
      "material": "other",
      "shape": "<path d=\"M55 55H945V705H55Z\"/>",
      "wash": "#e3ece6"
    },
    {
      "id": "grass",
      "label": "풀과 작은 잎",
      "material": "foliage",
      "shape": "<path d=\"M55 387Q276 325 479 393Q704 324 945 370V705H55Z\"/>",
      "wash": "#d2deaf"
    },
    {
      "id": "path",
      "label": "정원의 길",
      "material": "stone",
      "shape": "<path d=\"M481 359H527Q492 446 570 522Q634 589 610 705H290Q444 589 429 513Q404 432 481 359Z\"/>",
      "wash": "#ead5b5"
    },
    {
      "id": "trees",
      "label": "큰 나무와 가지",
      "material": "foliage",
      "shape": "<path d=\"M170 558L184 240L207 236L216 558Z M783 535L790 222H812L828 535Z M90 303Q38 264 91 216Q37 144 117 123Q134 46 196 84Q257 40 281 123Q364 142 311 209Q350 280 279 304Q214 346 174 304Q128 337 90 303Z M710 291Q650 249 706 194Q671 126 740 109Q777 45 826 91Q903 64 904 143Q972 173 926 233Q947 304 866 299Q794 341 750 294Z\"/>",
      "wash": "#c4d2a8"
    },
    {
      "id": "bench",
      "label": "길 옆 벤치",
      "material": "wood",
      "shape": "<path d=\"M664 436L868 416L870 435L665 454Z M665 465L870 445V463L666 483Z M663 490L870 468L902 499L694 528Z M692 528V611H705V527 M877 502V579H889V501 M670 480L674 562 M868 458L875 544\"/>",
      "wash": "#ddc69e"
    }
  ],
  "details": "<path d=\"M193 516L181 249L146 192 M198 371L235 237L266 178 M799 485L808 241L861 166 M797 361L762 242L735 194 M317 691L599 676 M380 610L613 600 M424 547L587 539 M433 483L535 480 M456 427L509 427 M91 598L86 575 M91 598L106 582 M264 582L256 553 M264 582L281 562 M880 655L871 630 M880 655L896 639\"/><ellipse cx=\"102\" cy=\"621\" rx=\"28\" ry=\"10\"/><ellipse cx=\"245\" cy=\"629\" rx=\"19\" ry=\"8\"/>",
  "shadows": {
    "upper-left": "<path d=\"M170 552H216L445 654L398 688Z M785 529H826L945 605V652Z M694 605L889 576L942 641L747 666Z\"/>",
    "upper-right": "<path d=\"M170 552H216L81 670H55V623Z M785 529H826L623 645L566 614Z M693 605L890 576L731 682L545 697Z\"/>",
    "left": "<path d=\"M170 552H216L519 605L452 634Z M785 529H826L945 552V587Z M694 605L889 576L945 602V641L796 655Z\"/>",
    "right": "<path d=\"M170 552H216L55 605V575Z M785 529H826L514 597L460 567Z M694 605L889 576L535 681L348 698Z\"/>"
  },
  "longShadows": {
    "upper-left": "<path d=\"M170 552H216L579 705H459Z M785 529H826L945 650V705Z M694 605L889 576L945 680V705H799Z\"/>",
    "upper-right": "<path d=\"M170 552H216L100 705H55V646Z M785 529H826L491 705H390Z M693 605L890 576L645 705H422Z\"/>",
    "left": "<path d=\"M170 552H216L733 670L662 705Z M785 529H826L945 552V646Z M694 605L889 576L945 602V705H803Z\"/>",
    "right": "<path d=\"M170 552H216L55 647V575Z M785 529H826L279 655L215 621Z M694 605L889 576L388 705H195Z\"/>"
  },
  "facets": {
    "left": "<path d=\"M195 251L207 236L216 558H202Z M801 222H812L828 535H810Z M861 417L869 417L871 483L860 485Z\"/>",
    "right": "<path d=\"M184 240L193 244L184 558H170Z M790 222H800L799 535H783Z M665 438L675 437V483L666 484Z\"/>"
  }
}
