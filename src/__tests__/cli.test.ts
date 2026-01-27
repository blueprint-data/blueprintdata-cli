import { describe, expect, it } from 'bun:test';
import { createCli } from '../cli';

describe('CLI', () => {
  it('creates CLI instance', () => {
    const cli = createCli();
    expect(cli.name()).toBe('blueprintdata');
  });

  it('has template command', () => {
    const cli = createCli();
    const templateCmd = cli.commands.find((cmd) => cmd.name() === 'template');
    expect(templateCmd).toBeDefined();
  });
});
