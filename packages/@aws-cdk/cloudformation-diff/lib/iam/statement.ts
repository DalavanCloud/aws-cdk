import deepEqual = require('fast-deep-equal');

export class Statement {
  /**
   * Statement ID
   */
  public readonly sid: string | undefined;

  /**
   * Statement effect
   */
  public readonly effect: Effect;

  /**
   * Resources
   */
  public readonly resources: Targets;

  /**
   * Principals
   */
  public readonly principals: Targets;

  /**
   * Actions
   */
  public readonly actions: Targets;

  /**
   * Object with conditions
   */
  public readonly condition?: any;

  constructor(statement: UnknownMap) {
    this.sid = expectString(statement.Sid);
    this.effect = expectEffect(statement.Effect);
    this.resources = new Targets(statement, 'Resource', 'NotResource');
    this.actions = new Targets(statement, 'Action', 'NotAction');
    this.principals = new Targets(statement, 'Principal', 'NotPrincipal');
    this.condition = statement.Condition;
  }

  /**
   * Whether this statement is equal to the other statement
   */
  public equal(other: Statement) {
    return (this.sid === other.sid
      && this.effect === other.effect
      && this.resources.equal(other.resources)
      && this.actions.equal(other.actions)
      && this.principals.equal(other.principals)
      && deepEqual(this.condition, other.condition));
  }

}

/**
 * Parse a list of statements from undefined, a Statement, or a list of statements
 * @param x Pa
 */
export function parseStatements(x: any): Statement[] {
  if (x === undefined) { x = []; }
  if (!Array.isArray(x)) { x = [x]; }
  return x.map((s: any) => new Statement(s));
}

/**
 * Targets for a field
 */
export class Targets {
  /**
   * The values of the targets
   */
  public readonly values: string[];

  /**
   * Whether positive or negative matchers
   */
  public readonly not: boolean;

  constructor(statement: UnknownMap, positiveKey: string, negativeKey: string) {
    if (negativeKey in statement) {
      this.values = forceListOfStrings(statement[negativeKey]);
      this.not = true;
    } else {
      this.values = forceListOfStrings(statement[positiveKey]);
      this.not = false;
    }
    this.values.sort();
  }

  public get empty() {
    return this.values.length === 0;
  }

  /**
   * Whether this set of targets is equal to the other set of targets
   */
  public equal(other: Targets) {
    return this.not === other.not && deepEqual(this.values.sort(), other.values.sort());
  }

  /**
   * If the current value set is empty, put this in it
   */
  public replaceEmpty(replacement: string) {
    if (this.empty) {
      this.values.push(replacement);
    }
  }

  /**
   * If the actions contains a '*', replace with this string.
   */
  public replaceStar(replacement: string) {
    for (let i = 0; i < this.values.length; i++) {
      if (this.values[i] === '*') {
        this.values[i] = replacement;
      }
    }
    this.values.sort();
  }
}

type UnknownMap = {[key: string]: unknown};

export enum Effect {
  Allow = 'Allow',
  Deny = 'Deny',
}

function expectString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function expectEffect(x: unknown): Effect {
  if (x === Effect.Allow || x === Effect.Deny) { return x as Effect; }
  throw new Error(`Unknown effect: ${x}`);
}

function forceListOfStrings(x: unknown): string[] {
  if (typeof x === 'string') { return [x]; }
  if (typeof x === 'undefined' || x === null) { return []; }
  if (Array.isArray(x)) {
    return x.map(el => `${el}`);
  }

  if (typeof x === 'object') {
    const ret: string[] = [];
    for (const [key, value] of Object.entries(x)) {
      ret.push(...forceListOfStrings(value).map(s => `${key}:${s}`));
    }
    return ret;
  }

  return [`${x}`];
}