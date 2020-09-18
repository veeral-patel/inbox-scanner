// Used to filter null and undefined values out of arrays
export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function flatten<T>(listOfLists: T[][]): T[] {
  let flattenedList: T[] = [];
  listOfLists.forEach((list) => {
    flattenedList = flattenedList.concat(list);
  });
  return flattenedList;
}
