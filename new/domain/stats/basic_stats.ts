import { LastTouch, Total } from "../common/interfaces.ts";

/**
 * simple base stats calculations
 * used in all aggregators in all dimensions
 * as value object
 */
export class BasicStats {
  public total: Total = 0;
  public lastTs: LastTouch = new Date();

  inc(by: number) {
    this.lastTs = new Date();
    this.total += by;
  }
}
