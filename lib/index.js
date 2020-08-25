#!/usr/bin/env node
'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var main = function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var host, report, chrome, options, snapshot, reportJSON, reportHTML;
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        if (process.argv.includes(OPTION_HELP)) {
                            printHelp();
                            exitWithoutError();
                        }
                        if (isDebuged()) {
                            console.log(' Lighthouse audit info: ' + yellow('Debug mode'));
                        }

                        host = getUrl();


                        if (!host) {
                            console.log(' You must define the url');
                            printHelp();
                            exitWithError();
                        } else {
                            console.log(' Auditing ' + yellow(host));
                        }

                        report = void 0;
                        _context.prev = 5;

                        console.log(' Categories: ' + yellow(getCategories().join(', ')));
                        console.log(' Running with variability of ' + yellow(getVariability() + '%'));
                        _context.next = 10;
                        return chromeLauncher.launch({ chromeFlags: ['--headless'] });

                    case 10:
                        chrome = _context.sent;
                        options = { logLevel: 'silent', output: ['json', 'html'], onlyCategories: getCategories(), port: chrome.port };
                        _context.next = 14;
                        return lighthouse(host, options);

                    case 14:
                        report = _context.sent;
                        _context.next = 17;
                        return chrome.kill();

                    case 17:
                        _context.next = 24;
                        break;

                    case 19:
                        _context.prev = 19;
                        _context.t0 = _context['catch'](5);

                        console.log(' Error getting lighthouse report\n', _context.t0);
                        printHelp();
                        exitWithError();

                    case 24:
                        snapshot = getSnapshotFile();
                        reportJSON = reportGenerator.generateReport(report.lhr, 'json');
                        reportHTML = reportGenerator.generateReport(report.lhr, 'html');


                        if (!fs.existsSync(snapshot)) {
                            console.log(' Not snapshot file found. ' + yellow('Saving ' + snapshot + ' with current audit'));
                            writeFile(snapshot, reportJSON);
                        }

                        lint(readFile(snapshot), JSON.parse(reportJSON), reportHTML);

                    case 29:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this, [[5, 19]]);
    }));

    return function main() {
        return _ref2.apply(this, arguments);
    };
}();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var lighthouse = require('lighthouse');
var chromeLauncher = require('chrome-launcher');
var prompt = require('prompt-sync')();
var reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

var _require = require('chalk'),
    yellow = _require.yellow,
    red = _require.red,
    green = _require.green,
    white = _require.white,
    blue = _require.blue;

var OPTION_VARIABILITY = '--variability';
var OPTION_HELP = '--help';
var OPTION_URL = '--url';
var OPTION_DEBUG = '--debug';
var OPTION_SNAPSHOT = '--snapshot';
var OPTION_CATEGORIES = '--categories';

var DEFAULT_SNAPSHOT_FILE = 'lighthouse.json';
var DEFAULT_CATEGORIES = 'performance,accessibility,best-practices,seo';
var DEFAULT_VARIABILITY = 0;

var IGNORE_FILE = '.lighthouseignore';

var exitWithError = function exitWithError() {
    var err = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

    console.log(red(' Exits with errors\n'));
    process.exit(err);
};

var exitWithoutError = function exitWithoutError() {
    console.log(green(' Exits without errors\n'));
    process.exit(0);
};

var readFile = function readFile(fileName) {
    try {
        return JSON.parse(fs.readFileSync(fileName, 'utf8'));
    } catch (error) {
        console.log(' [x] Error: ' + red('Error reading file') + ' ' + fileName + ' \n', error);
        printHelp();
        exitWithError();
    }
};

var writeFile = function writeFile(fileName, content) {
    try {
        fs.writeFileSync(fileName, content);
    } catch (err) {
        console.log(red('  ...error saving file ' + fileName));
        exitWithError();
    }
};

var getOption = function getOption(option, defaultValue) {
    var _process = process,
        argv = _process.argv;

    if (argv.includes(option)) {
        try {
            return argv[argv.indexOf(option) + 1];
        } catch (error) {
            console.log(' Error with variability params: ');
            console.log(error);
            printHelp();
            exitWithError(1);
        }
    }
    return defaultValue;
};

var getVariability = function getVariability() {
    return parseFloat(getOption(OPTION_VARIABILITY, DEFAULT_VARIABILITY));
};
var getUrl = function getUrl() {
    return getOption(OPTION_URL, false);
};
var getSnapshotFile = function getSnapshotFile() {
    return getOption(OPTION_SNAPSHOT, DEFAULT_SNAPSHOT_FILE);
};
var getCategories = function getCategories() {
    return getOption(OPTION_CATEGORIES, DEFAULT_CATEGORIES).split(',');
};
var isDebuged = function isDebuged() {
    return process.argv.includes(OPTION_DEBUG);
};

var getIgnoreFields = function getIgnoreFields() {
    if (fs.existsSync(IGNORE_FILE)) {
        console.log(' Using ignore file');
        return readFile(IGNORE_FILE);
    }
    return [];
};

var compareScores = function compareScores(oldScore, newScore, variability) {
    return oldScore * (1 - variability) > newScore;
};

var printHelp = function printHelp() {
    console.log(' Usage: node lighthouse.js (options)\n');
    console.log(' Options:');
    console.log(' ' + OPTION_URL + ' <url>                Url for the audit (required)');
    console.log(' ' + OPTION_VARIABILITY + ' <percent>    Percent of variability in score variation (' + DEFAULT_VARIABILITY + ' by default)');
    console.log('                            example: ' + OPTION_VARIABILITY + ' 0.2)');
    console.log(' ' + OPTION_SNAPSHOT + ' <snapshotName>  Name of de JSON snapshot file (\'' + DEFAULT_SNAPSHOT_FILE + '\' by default)');
    console.log('                            example: ' + OPTION_SNAPSHOT + ' ' + DEFAULT_SNAPSHOT_FILE + ')');
    console.log(' ' + OPTION_CATEGORIES + ' <categories>  Audit categories. Without spaces. Separated by commas');
    console.log('                            example: ' + OPTION_CATEGORIES + ' ' + DEFAULT_CATEGORIES + ')');
    console.log(' ' + OPTION_HELP + '                     Show this message');
    console.log('\n');
};

var lint = function lint(snapshotConfig, jsonInput, reportHTML) {
    var errors = [];
    var snapshotTotalScore = 0;
    var totalScore = 0;
    var analysed = 0;
    var ignored = 0;
    var skipped = 0;
    var totalNewFields = 0;
    var variability = getVariability();
    var ignoreFields = getIgnoreFields();

    Object.keys(jsonInput.audits).forEach(function (element) {
        if (snapshotConfig.audits[element] && snapshotConfig.audits[element].score) {
            var initialScore = snapshotConfig.audits[element].score;
            var newScore = jsonInput.audits[element].score;
            totalScore += newScore;
            snapshotTotalScore += initialScore;
            analysed++;
            if (!jsonInput.audits[element].score) {
                skipped++;
                return;
            }
            if (ignoreFields.includes(element)) {
                ignored++;
                return;
            }
            if (compareScores(initialScore, newScore, variability)) {
                errors.push({
                    initialScore: initialScore,
                    newScore: newScore,
                    field: element,
                    fieldInfo: jsonInput.audits[element]
                });
            }
        } else {
            totalNewFields++;
        }
    });

    if (errors.length) {
        console.log('\n Lighthouse audit founds ' + red(errors.length) + ' error(s):');
        errors.forEach(function (_ref) {
            var initialScore = _ref.initialScore,
                newScore = _ref.newScore,
                field = _ref.field,
                fieldInfo = _ref.fieldInfo;

            console.log(white('\n Error on ' + yellow(fieldInfo.title) + ' (' + field + ').'));
            console.log(' The previous score (' + red(initialScore) + ') greater than actual score (' + red(newScore) + ')');
            console.log(' ' + fieldInfo.description);
            if (isDebuged()) {
                var answer = prompt(' Do you want add ' + yellow(field) + ' to ignored elements? (y/N)');
                if ((answer || '').trim().toUpperCase() === 'Y') {
                    ignoreFields.push(field);
                }
            }
        });
        console.log('\n Previous total score (' + red(snapshotTotalScore.toFixed(2)) + ') greater than actual total score (' + red(totalScore.toFixed(2)) + ')\n');
    }

    totalNewFields && console.log(' Warning: No tested items with score (' + red(totalNewFields) + ')\n');
    console.log(' ' + white(analysed) + ' analyzed scores: ' + blue(skipped) + ' skipped scores, ' + yellow(ignored) + ' ignored scores and ' + red(errors.length) + ' error(s) founds');

    if (isDebuged()) {
        console.log(' > Updating ' + white(IGNORE_FILE) + '...');
        writeFile(IGNORE_FILE, JSON.stringify(ignoreFields));
    }

    if (totalScore < snapshotTotalScore && isDebuged()) {
        var answer = prompt(' [?] Do you want to update the snapshot? (y/N)');
        if ((answer || '').trim().toUpperCase() === 'Y') {
            var file = getSnapshotFile();
            console.log(' > Updating snapshot ' + white(file) + '...');
            writeFile(getSnapshotFile(), JSON.stringify(jsonInput));
        }
    }

    if (errors.length) {
        var fileHTML = getSnapshotFile() + '.html';
        console.log(' [>] Saving report in ' + white(fileHTML));
        writeFile(fileHTML, reportHTML);
        exitWithError();
    }

    console.log(green(' Lighthouse audition passed.') + ' Total score: ' + yellow(totalScore.toFixed(2)));

    exitWithoutError();
};

main();