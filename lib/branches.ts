// Ангийн 3 салаа
export const BRANCHES = [
  { id: 1, name: "1-р салаа", gradient: "from-sky-500 to-blue-600" },
  { id: 2, name: "2-р салаа", gradient: "from-emerald-500 to-teal-600" },
  { id: 3, name: "3-р салаа", gradient: "from-fuchsia-500 to-purple-600" },
] as const;

export function isValidBranch(x: unknown): x is 1 | 2 | 3 {
  return x === 1 || x === 2 || x === 3;
}

export function branchName(id: number) {
  return BRANCHES.find((b) => b.id === id)?.name ?? `${id}-р салаа`;
}
