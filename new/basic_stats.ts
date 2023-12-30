type Average = number;
type Minimum = number;
type Maximum = number;
type Total = number;
type LastTouch = Date;

/**
 * simple base stats calculations
 * used in all aggregators in all dimensions
 * as value object
 */
export class BasicStats {
  public avg: Average = 0;
  public total: Total = 0;
  public min: Minimum = 0;
  public max: Maximum = 0;
  public lastTs: LastTouch = new Date();

  inc(by = 1) {
    this.lastTs = new Date();
    this.total += by;
    this.avg = this.total / by;
    this.min = Math.min(this.min, by);
    this.max = Math.max(this.max, by);
  }
}
