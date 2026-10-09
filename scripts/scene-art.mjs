// Original, editable vector artwork. All assets share a 1000 × 760 coordinate space.
const path = d => `<path d="${d}"/>`
const ellipse = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`
const plant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  ${path('M-30 0H30L23 60Q0 72 -23 60Z M0 0V-125 M0-38L-42-76 M0-62L40-108 M0-83L-27-121')}
  <ellipse cx="-36" cy="-83" rx="17" ry="32" transform="rotate(-40 -36 -83)"/>
  <ellipse cx="35" cy="-111" rx="17" ry="32" transform="rotate(38 35 -111)"/>
  <ellipse cx="-22" cy="-126" rx="14" ry="30" transform="rotate(-27 -22 -126)"/>
  <ellipse cx="8" cy="-147" rx="15" ry="32" transform="rotate(13 8 -147)"/>
  ${path('M-33 5Q0 13 33 5 M-17 15L-13 49')}
</g>`
const chair = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  ${path('M0 0Q80-25 157 0L148 120Q73 145 7 120Z M9 120L-5 153Q70 183 157 153L148 120 M0-5L-15 247 M158-5L178 247 M-25 99L176 99 M-25 109L176 109 M-12 160L169 245 M157 160L-4 245 M-26 97L-24 168 M176 97L180 168 M12 12Q79-8 144 13 M15 23Q79 5 141 25 M28 126Q77 141 132 128')}
</g>`

export const artworks = [
  {
    id: 'reference-plant-room', indoor: true, wash: '#f6e9aa',
    regions: [
      { id: 'wall', label: '벽과 창가', material: 'stone', shape: path('M55 55H945V425L55 510Z'), wash: '#f8edc6' },
      { id: 'floor', label: '바닥', material: 'wood', shape: path('M55 510L945 425V705H55Z'), wash: '#ead4a1' },
      { id: 'plants', label: '화분과 잎', material: 'foliage', shape: plant(150, 365, 1.2)+plant(260, 350, 0.8)+plant(850, 390, 1.3), wash: '#d5dbaf' },
      { id: 'chairs', label: '천 의자', material: 'fabric', shape: chair(340, 420, 0.95)+chair(635, 380, 0.95), wash: '#f6e9aa' },
      { id: 'table', label: '작은 테이블', material: 'wood', shape: path('M95 435L266 414L310 455L136 480Z M136 480V625 M282 462V592 M158 478L156 625 M265 467L264 595'), wash: '#e2c9a2' },
    ],
    details: path('M55 510L945 425 M410 55V378 M450 70H760V335H450Z M605 70V335 M450 190H760 M55 588L945 490 M55 675L945 565 M250 491L170 705 M500 466L505 705 M760 442L855 705')+ellipse(201, 433, 27, 11)+path('M176 433V406Q199 394 224 406V433 M224 408Q247 404 243 424Q239 433 225 427'),
    shadows: {
      'upper-left': path('M346 560L500 575L607 693L452 665Z M643 527L798 531L912 650L755 632Z M137 480L161 490L250 625L222 625Z'),
      'upper-right': path('M347 560L496 565L361 690L210 667Z M644 527L794 535L653 658L502 631Z M136 481L160 484L92 622L65 612Z'),
      left: path('M348 565L499 570L660 623L506 620Z M644 532L796 539L940 585L788 593Z'),
      right: path('M348 565L498 570L264 630L116 608Z M644 532L796 539L565 605L414 587Z'),
    },
    facets: {
      left: path('M480 423L488 526L465 534L465 421Z M776 384L777 488L755 496L754 382Z M852 389L882 389L873 468L850 473Z'),
      right: path('M342 424L366 422L368 533L349 531Z M637 384L658 383L661 494L643 493Z M814 391L844 391L847 474L824 467Z'),
    },
  },
  {
    id: 'window-still-life', indoor: true, wash: '#f5ead5',
    regions: [
      { id: 'wall', label: '벽과 창문', material: 'stone', shape: path('M55 55H945V425H55Z'), wash: '#e4eee8' },
      { id: 'table', label: '나무 테이블', material: 'wood', shape: path('M55 425H945V705H55Z'), wash: '#ead9be' },
      { id: 'cloth', label: '접힌 천', material: 'fabric', shape: path('M250 420Q410 387 573 430L703 630Q503 673 282 625L184 481Z'), wash: '#efdfd3' },
      { id: 'cup', label: '컵과 접시', material: 'ceramic', shape: ellipse(417, 505, 112, 30)+path('M357 410Q417 390 477 410L464 481Q417 515 370 480Z M477 421Q523 406 519 445Q514 469 473 463')+ellipse(417, 410, 60, 15), wash: '#f1edda' },
      { id: 'plants', label: '창가 화분', material: 'foliage', shape: plant(699, 373, 1.45), wash: '#ccdcbf' },
    ],
    details: path('M110 65H849V359H110Z M135 86H824V334H135Z M480 86V334 M135 210H824 M85 359H876V379H85Z M55 425H945 M55 593H230 M740 593H945 M318 441Q358 488 314 588 M574 467L629 604 M365 414Q419 431 469 414')+ellipse(417, 410, 48, 10),
    shadows: {
      'upper-left': path('M378 494Q455 471 481 496L614 585Q525 619 459 585Z M663 453Q708 470 740 451L865 535Q794 564 744 528Z'),
      'upper-right': path('M375 492Q432 480 469 496L330 587Q254 600 224 566Z M661 452L736 454L589 547L514 525Z'),
      left: path('M379 494L467 493L674 535L601 552Z M663 453L734 453L938 496L861 515Z'),
      right: path('M379 494L467 493L254 549L159 532Z M663 453L734 453L514 510L443 488Z'),
    },
    facets: { left: path('M449 423L474 416L462 479Q451 490 438 493Z M701 375H742L731 460L701 472Z'), right: path('M359 416L384 422L392 492Q380 486 370 478Z M655 375H694L696 472L665 460Z') },
  },
  {
    id: 'lakeside', indoor: false, wash: '#e6edf0',
    regions: [
      { id: 'sky', label: '하늘', material: 'other', shape: path('M55 55H945V343H55Z'), wash: '#dfe9eb' },
      { id: 'mountains', label: '먼 산', material: 'stone', shape: path('M55 341L195 197L277 285L405 167L528 302L652 230L786 318L945 222V400H55Z'), wash: '#ccd7d1' },
      { id: 'water', label: '호수의 수면', material: 'water', shape: path('M55 371Q432 335 945 363V705H55Z'), wash: '#d3e5e6' },
      { id: 'shore', label: '앞쪽 물가', material: 'stone', shape: path('M55 579Q245 529 367 600Q488 652 621 705H55Z'), wash: '#dfd6b7' },
      { id: 'tree', label: '물가의 나무', material: 'foliage', shape: path('M169 601L185 340L196 598Z M97 396Q44 370 85 319Q43 269 104 240Q99 170 168 191Q197 140 239 197Q312 179 308 245Q367 273 326 315Q358 374 293 390Q236 430 193 393Q151 439 97 396Z'), wash: '#c8d6ac' },
    ],
    details: path('M175 531L160 388L122 303 M178 472L226 357L270 285 M178 428L191 279 M55 371Q437 332 945 363 M342 413H550 M676 399H831 M442 459H756 M718 511H918 M362 547H541 M552 590H821 M710 649H904 M387 628Q455 601 500 643 M122 630Q156 605 190 635 M227 661Q263 633 307 667 M407 168L424 264L464 246 M194 198L209 282L248 262'),
    shadows: {
      'upper-left': path('M176 599L202 594L463 680L421 704L315 679Z M97 395Q188 450 285 395L395 468Q240 493 137 438Z'),
      'upper-right': path('M177 599L202 600L122 703H55V676Z M97 395Q187 449 285 395L233 478Q129 487 69 435Z'),
      left: path('M175 598L202 597L525 635L465 660Z M196 199L277 285L226 295L207 257Z M405 168L528 302L463 286L424 230Z'),
      right: path('M175 598L202 597L55 656V626Z M195 199L115 281L161 282L193 251Z M405 168L297 272L353 281L402 229Z'),
    },
    facets: { left: path('M405 168L528 302L462 289L423 232Z M652 230L786 318L715 304Z M188 347L197 597H184Z'), right: path('M405 168L277 285L355 279L400 223Z M652 230L572 291L621 286Z M171 601L182 346L187 599Z') },
  },
]
