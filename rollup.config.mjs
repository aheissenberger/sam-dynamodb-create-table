import pkg from './package.json' assert {type: 'json'};
import {terser} from "rollup-plugin-terser";


export default {
	input: 'src/index.mjs',
	output: [
		{
			file: pkg.main,
			format: 'cjs'
		}
	],
	external: [
		...Object.keys(pkg.dependencies || {})
	],
	plugins: [
		terser()
	]
};