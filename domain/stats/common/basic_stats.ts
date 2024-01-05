import { LastTouch, Total } from "../../common/interfaces.ts";

/**
 * simple base stats calculations
 * used in all aggregators in all dimensions
 * as value object
 */
export class BasicStats {
  public total: Total = 0;
  public lastTs: LastTouch = new Date();
  public firstTs: LastTouch = new Date();

  inc(by: number, ts: Date) {
    if (this.firstTs.getTime() === 0) {
      this.firstTs = ts;
    }
    this.lastTs = ts;
    this.total += by;
  }
}
