/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const path = require('path');
const azure = require('gulp-azure-storage');
const util = require('../lib/util');
const root = path.dirname(path.dirname(__dirname));
const commit = util.getVersion(root);
const packageJson = require('../../package.json');
const settings = require('../lib/settings');

function generateVSCodeConfigurationTask() {
	return new Promise((resolve, reject) => {
		const buildDir = process.env['AGENT_BUILDDIRECTORY'];
		if (!buildDir) {
			return reject(new Error('$AGENT_BUILDDIRECTORY not set'));
		}

		if (process.env.VSCODE_QUALITY !== 'insider' && process.env.VSCODE_QUALITY !== 'stable') {
			return resolve();
		}

		const userDataDir = path.join(os.tmpdir(), 'tmpuserdata');
		const extensionsDir = path.join(os.tmpdir(), 'tmpextdir');
		const appName = process.env.VSCODE_QUALITY === 'insider' ? 'Visual\\ Studio\\ Code\\ -\\ Insiders.app' : 'Visual\\ Studio\\ Code.app';
		const appPath = path.join(buildDir, `VSCode-darwin/${appName}/Contents/Resources/app/bin/code`);
		const codeProc = cp.exec(`${appPath} --export-default-configuration='${allConfigDetailsPath}' --wait --user-data-dir='${userDataDir}' --extensions-dir='${extensionsDir}'`);

		const timer = setTimeout(() => {
			codeProc.kill();
			reject(new Error('export-default-configuration process timed out'));
		}, 10 * 1000);

		codeProc.stdout.on('data', d => console.log(d.toString()));
		codeProc.stderr.on('data', d => console.log(d.toString()));

		codeProc.on('exit', () => {
			clearTimeout(timer);
			resolve();
		});

		codeProc.on('error', err => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

const allConfigDetailsPath = path.join(os.tmpdir(), 'configuration.json');

function main() {
	return generateVSCodeConfigurationTask().then(() => {
		if (!settings.shouldSetupSettingsSearch()) {
			const branch = process.env.BUILD_SOURCEBRANCH;
			console.log(`Only runs on master and release branches, not ${branch}`);
			return;
		}

		if (!fs.existsSync(allConfigDetailsPath)) {
			throw new Error(`configuration file at ${allConfigDetailsPath} does not exist`);
		}

		const settingsSearchBuildId = settings.getSettingsSearchBuildId(packageJson);
		if (!settingsSearchBuildId) {
			throw new Error('Failed to compute build number');
		}

		return gulp.src(allConfigDetailsPath)
			.pipe(azure.upload({
				account: process.env.AZURE_STORAGE_ACCOUNT,
				key: process.env.AZURE_STORAGE_ACCESS_KEY,
				container: 'configuration',
				prefix: `${settingsSearchBuildId}/${commit}/`
			}));
	});
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});