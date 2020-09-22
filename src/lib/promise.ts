import Bluebird from 'bluebird';

function reflect<T>(
  promise: Bluebird<T>
): Bluebird<{ value: T; status: string } | { error: any; status: string }> {
  return promise.then(
    function (value) {
      return { value, status: 'fulfilled' };
    },
    function (error) {
      return { error, status: 'rejected' };
    }
  );
}

export function allSettledCustom<T>(
  promises: Bluebird<T>[]
): Bluebird<({ value: T; status: string } | { error: any; status: string })[]> {
  return Bluebird.all(
    promises.map(function (promise) {
      return reflect(promise);
    })
  );
}
