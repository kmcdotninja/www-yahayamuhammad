// The Arabic alphabet for tracing (trace.jsx), Alif to Yaa, each letter on its own (isolated) as children first learn
// it: [letter, strokes, its name as Kiko says it]. Built like the capitals: only straight lines and true circular or
// elliptical arcs, meeting along the same direction, one stroke weight with round ends (trace.css), the same scale and
// weight as the capitals. Drawn to the letters as designed (Arabic Alphabet/*.svg), each centred on 50,50.
// Letters that share a body share it exactly, moved down to make room for dots above (ت ث from ب, خ from ح, ذ ز ش ض
// غ from د ر س ص ع). Strokes in the order and direction children write them, right to left, top to bottom: each body
// one stroke (س ش are two round cups of one size and a bowl, the three teeth level, the pen going up
// each tooth and back down), but ط ظ the standing stroke first, then the body lying under it; then the dots, each a
// tap (a stroke of no length), lower row first, right to left.
// Two dots sit side by side, a gap of 6 between them; three, the same and the third centred on top, all equally apart.
// A stroke starting m0 0 is drawn thin (ك's mark, as in the type)
const dot = (x, y) => `M${x} ${y} h.1`;
export const AR = [
  ['ا', ['M49.5 16 V84'], 'Alif'],
  ['ب', ['M95 18 V31 A45 25 0 0 1 5 31 V22', dot(48.1, 83.4)], 'Baa'],
  ['ت', ['M95 41.4 V54.4 A45 25 0 0 1 5 54.4 V45.4', dot(62, 21.5), dot(35.5, 21.5)], 'Taa'],
  ['ث', ['M95 50.4 V63.4 A45 25 0 0 1 5 63.4 V54.4', dot(61.8, 30.6), dot(35.2, 30.6), dot(48.5, 7.7)], 'Thaa'],
  ['ج', ['M24 6 C44 4 66 12 81 25 C64 22 20 38 20 66 A30 27.6 0 0 0 50 93.6 C62 93.6 72 92 78 89', dot(56.4, 63)], 'Jeem'],
  ['ح', ['M24 6 C44 4 66 12 81 25 C64 22 20 38 20 66 A30 27.6 0 0 0 50 93.6 C62 93.6 72 92 78 89'], 'Haa'],
  ['خ', ['M24 21 C44 19 66 27 81 40 C64 37 20 53 20 81 A30 27.6 0 0 0 50 108.6 C62 108.6 72 107 78 104', dot(48, -10.8)], 'Khaa'],
  ['د', ['M56 28 C60 40 68 50 68 58 A14 14 0 0 1 54 72 H29'], 'Daal'],
  ['ذ', ['M56 42 C60 54 68 64 68 72 A14 14 0 0 1 54 86 H29', dot(46.1, 12.2)], 'Dhaal'],
  ['ر', ['M58 25 C69 46 60 68 37 75.3'], 'Raa'],
  ['ز', ['M58 40.5 C69 61.5 60 83.5 37 90.8', dot(52.5, 6.2)], 'Zaay'],
  ['س', ['M120 26 V40 A20 17.5 0 0 1 80 40 V26 V40 A20 17.5 0 0 1 40 40 V26 V58 A30.5 27 0 0 1 -21 58 V47'], 'Seen'],
  ['ش', ['M120 44 V58 A20 17.5 0 0 1 80 58 V44 V58 A20 17.5 0 0 1 40 58 V44 V76 A30.5 27 0 0 1 -21 76 V65', dot(93.4, 17), dot(66.9, 17), dot(80.2, -5.9)], 'Sheen'],
  ['ص', ['M40 55 C58 55 72 18 99 18 A25 19 0 0 1 99 56 H54 A18 18 0 0 1 36 38 V30 V55 A30 27 0 0 1 -24 55 V38'], 'Saad'],
  ['ض', ['M40 70 C58 70 72 33 99 33 A25 19 0 0 1 99 71 H54 A18 18 0 0 1 36 53 V45 V70 A30 27 0 0 1 -24 70 V53', dot(102.9, 2.7)], 'Daad'],
  ['ط', ['M32 14 L27 76', 'M7 76 A12 10 0 0 0 19 86 H66 A22 21.5 0 0 0 66 43 C50 43 44 64 30 77'], 'Tah'],
  ['ظ', ['M32 14 L27 76', 'M7 76 A12 10 0 0 0 19 86 H66 A22 21.5 0 0 0 66 43 C50 43 44 64 30 77', dot(74.9, 20.2)], 'Dhah'],
  ['ع', ['M54 6 H40 A17 17 0 0 0 40 40 C50 40 58 36 65 29 C40 44 18 52 18 72 A32 25 0 0 0 50 97 C62 97 72 96 78 92'], 'Ayn'],
  ['غ', ['M54 21.5 H40 A17 17 0 0 0 40 55.5 C50 55.5 58 51.5 65 44.5 C40 59.5 18 67.5 18 87.5 A32 25 0 0 0 50 112.5 C62 112.5 72 111.5 78 107.5', dot(46.2, -13.8)], 'Ghayn'],
  ['ف', ['M87 71.6 A18 18 0 1 1 96 56 V64 A46.6 30.5 0 0 1 2.8 64 V59', dot(80.1, 8.2)], 'Faa'],
  ['ق', ['M78 69.6 A18 18 0 1 1 87 54 V62 A37.1 30.2 0 0 1 12.8 62 V55', dot(85.2, 6.5), dot(58.8, 6.5)], 'Qaaf'],
  ['ك', ['M91.3 6 V62 A42.3 24.5 0 0 1 6.7 62 V53', 'm0 0M62 24.5 C55 27 48.8 30.5 48.8 35.6 C48.8 39.5 55.6 43 55.6 48 C55.6 52.5 50 55 37.7 59.6'], 'Kaaf'],
  ['ل', ['M79 0 V68 A30 31.5 0 0 1 19 68 V60'], 'Laam'],
  ['م', ['M36.7 20 A20 20 0 0 1 74 30 V38 A10 10 0 0 1 64 48 H40 A12 12 0 0 0 28 60 V89'], 'Meem'],
  ['ن', ['M79 39 V62 A30 31 0 0 1 19 62 V55', dot(49.5, 8.2)], 'Noon'],
  ['ه', ['M44 24 L33.1 49.9 A18.3 18.3 0 1 0 63.3 44.4 Z'], 'Ha'],
  ['و', ['M58 54.6 A18 18 0 1 1 67 39 V44 A39 34 0 0 1 28 78'], 'Waaw'],
  ['ي', ['M94 3 H70 A13 13 0 0 0 57 16 A14 14 0 0 0 71 30 A15 15 0 0 1 86 45 V47 A37.5 22 0 0 1 11 47 V30', dot(57.4, 97.6), dot(30.9, 97.6)], 'Yaa'],
];
