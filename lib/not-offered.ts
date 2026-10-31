/**
 * A record the test needs is not there: by default a type-ahead that does not offer it (it filters only the first 50
 * records it loaded, found blocker 40); `blocker` names another found blocker that stops the steps the same way
 * (58: a second patient of the same name is refused).
 */
export class NotOffered extends Error {
  constructor(
    message: string,
    readonly blocker = 40,
  ) {
    super(message);
  }
}
