// Werk verdelen over een vast aantal tegelijk — pure functie (tests/pool.test.mjs).
// Met veel gevolgde bronnen wil je niet tientallen verzoeken tegelijk open hebben; zes is wat
// een browser per server toch al tegelijk doet. Een fout stopt de rest (zoals Promise.all).
export async function eachLimited(list, limit, fn) {
  let next = 0
  const worker = async () => {
    while (next < list.length) {
      const i = next++
      await fn(list[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker))
}
