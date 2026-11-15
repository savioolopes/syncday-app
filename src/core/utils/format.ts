export const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
