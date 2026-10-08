// Patches defuddle's hidden-element detection: Tailwind pseudo-element
// variants like `first:before:hidden` hide a ::before decoration, not the
// element itself, but defuddle treats any class token ending in `:hidden`
// as "element is hidden" and removes it (kills e.g. new.web.cafe lists).
// Idempotent; throws if the pattern is missing (e.g. after a version bump).
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'node_modules', 'defuddle', 'dist');

// Skips tokens whose :hidden/:invisible applies to a pseudo-element
const GUARD_MIN = '!/(?:^|:)(?:before|after|placeholder|selection|marker|backdrop|file|first-line|first-letter):/.test(r)&&';
const GUARD_SRC = "!/(?:^|:)(?:before|after|placeholder|selection|marker|backdrop|file|first-line|first-letter):/.test(token) &&\n                    ";

const patches = [
	{
		file: 'index.js',
		old: 'includes("[")&&(r.endsWith(":hidden")||r.endsWith(":invisible"))',
		neu: 'includes("[")&&' + GUARD_MIN + '(r.endsWith(":hidden")||r.endsWith(":invisible"))',
	},
	{
		file: 'index.full.js',
		old: 'includes("[")&&(r.endsWith(":hidden")||r.endsWith(":invisible"))',
		neu: 'includes("[")&&' + GUARD_MIN + '(r.endsWith(":hidden")||r.endsWith(":invisible"))',
	},
	{
		file: path.join('removals', 'hidden.js'),
		old: "const isVariant = !token.includes('[') &&\n                    (token.endsWith(':hidden') || token.endsWith(':invisible'));",
		neu: "const isVariant = !token.includes('[') &&\n                    " + GUARD_SRC + "(token.endsWith(':hidden') || token.endsWith(':invisible'));",
	},
];

let changed = 0;
for (const p of patches) {
	const fp = path.join(dist, p.file);
	let src = fs.readFileSync(fp, 'utf8');
	if (src.includes(p.neu)) continue; // already patched
	if (!src.includes(p.old)) {
		throw new Error(`patch-defuddle: pattern not found in ${p.file} (defuddle updated? review the patch)`);
	}
	src = src.replace(p.old, p.neu);
	fs.writeFileSync(fp, src);
	changed++;
	console.log(`patch-defuddle: patched ${p.file}`);
}
if (changed === 0) console.log('patch-defuddle: already applied');
