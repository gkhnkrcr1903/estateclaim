"use client";

import { useEffect, useState } from "react";

// Sayı girişi: yazılan metni kendisi tutar. Kutu silinince değer hemen 0'a çevrilmez,
// böylece mobilde silip yazarken başa "0" eklenmez. Boş bırakılan kutu odaktan çıkınca 0 olur.
export default function SayiKutusu({
  deger,
  degistir,
  ...ek
}: { deger: number; degistir: (n: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [metin, setMetin] = useState(String(deger));
  // Değer dışarıdan değişirse (ör. il değişimi) kutuyu güncelle; yazılan metinle aynıysa dokunma.
  useEffect(() => {
    if (Number(metin.replace(",", ".")) !== deger) setMetin(String(deger));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deger]);
  return (
    <input
      type="number"
      inputMode="decimal"
      {...ek}
      value={metin}
      onChange={(x) => {
        const t = x.target.value;
        setMetin(t);
        if (t.trim() !== "" && Number.isFinite(Number(t))) degistir(Number(t));
      }}
      onBlur={() => {
        if (metin.trim() === "") {
          setMetin("0");
          degistir(0);
        }
      }}
    />
  );
}
