import { BabelFileResult, transform as babelTransform } from '@babel/core';
import { copyTmpDirectory } from '@ssen/tmp-directory';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import plugin from '../';

function format(code: string): string {
  return prettier.format(code, { parser: 'typescript' });
}

describe('@handbook/babel-plugin', () => {
  describe('file', () => {
    const output: string = `
      import { source } from "@handbook/source";
      source({
        module: require("../../c/d/e"),
        source: require("!!raw-loader!../../c/d/e").default,
        filename: "c/d/e.tsx",
      });
      source({
        module: require("c/d/e"),
        source: require("!!raw-loader!c/d/e").default,
        filename: "c/d/e.tsx",
      });
      source({
        module: () => import("../../c/d/e"),
        source: require("!!raw-loader!../../c/d/e").default,
        filename: "c/d/e.tsx",
      });
      source({
        module: () => import("c/d/e"),
        source: require("!!raw-loader!c/d/e").default,
        filename: "c/d/e.tsx",
      });
    `;

    test('should succeed to transform in src directory', async () => {
      const cwd = await copyTmpDirectory(path.join(process.cwd(), `test/fixtures/src-project`));
      const file = 'a/b/c.tsx';

      const filename = path.join(cwd, 'src', file);
      const source: string = fs.readFileSync(filename, { encoding: 'utf8' });

      const res: BabelFileResult | null = babelTransform(format(source), {
        babelrc: false,
        cwd,
        filename,
        plugins: [plugin, require.resolve('@babel/plugin-syntax-jsx')],
      });

      if (!res || !res.code) {
        throw new Error('plugin failed!');
      }

      // Assert
      expect(format(res.code)).toBe(format(output));
    });

    test('should succeed to transform in root directory', async () => {
      const cwd = await copyTmpDirectory(path.join(process.cwd(), `test/fixtures/root-project`));
      const file = 'a/b/c.tsx';

      const filename = path.join(cwd, file);
      const source: string = fs.readFileSync(filename, { encoding: 'utf8' });

      const res: BabelFileResult | null = babelTransform(format(source), {
        babelrc: false,
        cwd,
        filename,
        plugins: [plugin, require.resolve('@babel/plugin-syntax-jsx')],
      });

      if (!res || !res.code) {
        throw new Error('plugin failed!');
      }

      // Assert
      expect(format(res.code)).toBe(format(output));
    });
  });

  describe('source', () => {
    const filename = 'dir/test.tsx';

    function transform(code: string): string {
      const res: BabelFileResult | null = babelTransform(format(code), {
        babelrc: false,
        cwd: process.cwd(),
        filename: path.join(process.cwd(), 'src', filename),
        plugins: [plugin, '@babel/plugin-syntax-jsx'],
      });

      if (!res || !res.code) {
        throw new Error('plugin failed!');
      }

      return res.code;
    }

    test('should fail to transform', () => {
      // Arrange
      const source = `
      import { source } from '@handbook/source';
      import { foo } from './foo';
      source(Math.random());
      source(foo());
    `;

      // Assert
      expect(format(transform(source))).toBe(format(source));
    });

    test('should succeed to transform', () => {
      // Arrange
      process.env.HANDBOOK_TEST_EXT = '.tsx';

      const module = './samples/Sample';

      const source = `
      import { source } from '@handbook/source';
      source(require('${module}'));
      source(() => import('${module}'));
    `;

      const output = `
      import { source } from '@handbook/source';
      source({
        module: require('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
      source({
        module: () => import('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
    `;

      // Assert
      expect(format(transform(source))).toBe(format(output));
    });

    test('should succeed to transform in jsx', () => {
      // Arrange
      process.env.HANDBOOK_TEST_EXT = '.tsx';

      const module1 = './samples/Sample1';
      const module2 = './samples/Sample2';

      const source = `
      import { source } from '@handbook/source';
      import { Handbook, Preview, CodeBlock } from '@handbook/components';
      
      function App() {
        return (
          <div>
            <Handbook>
              {{
                index: {
                  Title1: source(require('${module1}')),
                  Title2: source(() => import('${module2}')),
                }
              }}
            </Handbook>
            
            <Preview source={source(require('${module1}'))}/>
            <Preview source={source(() => import('${module2}'))}/>
            
            <CodeBlock source={source(require('${module1}'))}/>
            <CodeBlock source={source(() => import('${module2}'))}/>
          </div>
        )
      }
    `;

      const output = `
      import { source } from '@handbook/source';
      import { Handbook, Preview, CodeBlock } from '@handbook/components';
      
      function App() {
        return (
          <div>
            <Handbook>
              {{
                index: {
                  Title1: source({
                    module: require('${module1}'),
                    source: require('!!raw-loader!${module1}').default,
                    filename: '${path.join(path.dirname(filename), module1)}.tsx',
                  }),
                  Title2: source({
                    module: () => import('${module2}'),
                    source: require('!!raw-loader!${module2}').default,
                    filename: '${path.join(path.dirname(filename), module2)}.tsx',
                  }),
                }
              }}
            </Handbook>
            
            <Preview source={source({
              module: require('${module1}'),
              source: require('!!raw-loader!${module1}').default,
              filename: '${path.join(path.dirname(filename), module1)}.tsx',
            })}/>
            <Preview source={source({
              module: () => import('${module2}'),
              source: require('!!raw-loader!${module2}').default,
              filename: '${path.join(path.dirname(filename), module2)}.tsx',
            })}/>
            
            <CodeBlock source={source({
              module: require('${module1}'),
              source: require('!!raw-loader!${module1}').default,
              filename: '${path.join(path.dirname(filename), module1)}.tsx',
            })}/>
            <CodeBlock source={source({
              module: () => import('${module2}'),
              source: require('!!raw-loader!${module2}').default,
              filename: '${path.join(path.dirname(filename), module2)}.tsx',
            })}/>
          </div>
        )
      }
    `;

      // Assert
      expect(format(transform(source))).toBe(format(output));
    });

    test('should succeed to transform namespace import', () => {
      // Arrange
      process.env.HANDBOOK_TEST_EXT = '.tsx';

      const module = './samples/Sample';

      const source = `
      import * as ns from '@handbook/source';
      ns.source(require('${module}'));
      ns.source(() => import('${module}'));
    `;

      const output = `
      import * as ns from '@handbook/source';
      ns.source({
        module: require('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
      ns.source({
        module: () => import('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
    `;

      // Assert
      expect(format(transform(source))).toBe(format(output));
    });

    test('should succeed to transform default import', () => {
      // Arrange
      process.env.HANDBOOK_TEST_EXT = '.tsx';

      const module = './samples/Sample';

      const source = `
      import ns from '@handbook/source';
      ns.source(require('${module}'));
      ns.source(() => import('${module}'));
    `;

      const output = `
      import ns from '@handbook/source';
      ns.source({
        module: require('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
      ns.source({
        module: () => import('${module}'),
        source: require('!!raw-loader!${module}').default,
        filename: '${path.join(path.dirname(filename), module)}.tsx',
      });
    `;

      // Assert
      expect(format(transform(source))).toBe(format(output));
    });
  });
});