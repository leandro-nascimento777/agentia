export class Message {
  constructor(
    readonly id: string,
    readonly body: string,
    readonly from: string,
    readonly timestamp: Date,
  ) {}
}
