import { describe, expect, it } from 'bun:test';
import { createCli } from '../cli';

describe('CLI', () => {
  it('creates CLI instance', () => {
    const cli = createCli();
    expect(cli.name()).toBe('blueprintdata');
  });

  it('has new command', () => {
    const cli = createCli();
    const newCmd = cli.commands.find((cmd) => cmd.name() === 'new');
    expect(newCmd).toBeDefined();
  });
});
