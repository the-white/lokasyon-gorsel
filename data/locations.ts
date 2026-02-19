export const provinces = [
  { id: 06, name: "Ankara" },
  { id: 10, name: "Balıkesir" },
  { id: 34, name: "İstanbul" },
];

export const districts: Record<number, { id: number; name: string }[]> = {
   06: [
    { id: 0601, name: "Eryaman" },
    { id: 0602, name: "Balgat" },
  ],
  10: [
    { id: 1001, name: "Karesi" },
    { id: 1002, name: "Altıeylül" },
  ],
  34: [
    { id: 3401, name: "Kadıköy" },
    { id: 3402, name: "Üsküdar" },
  ],
  
};
