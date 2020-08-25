#!/usr/bin/env node
const fs = require('fs')
const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const prompt = require('prompt-sync')()
const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');
const { yellow, red, green, white, blue } = require('chalk')

const OPTION_VARIABILITY = '--variability'
const OPTION_HELP = '--help'
const OPTION_URL = '--url'
const OPTION_DEBUG = '--debug'
const OPTION_SNAPSHOT = '--snapshot'
const OPTION_CATEGORIES = '--categories'

const DEFAULT_SNAPSHOT_FILE = 'lighthouse.json'
const DEFAULT_CATEGORIES = 'performance,accessibility,best-practices,seo'
const DEFAULT_VARIABILITY = 0

const IGNORE_FILE = '.lighthouseignore'

const exitWithError = (err = 1) => {
    console.log(red(' Exits with errors\n'))
    process.exit(err)
}

const exitWithoutError = () => {
    console.log(green(' Exits without errors\n'))
    process.exit(0)
}

const readFile = (fileName) => {
    try {
        return JSON.parse(fs.readFileSync(fileName, 'utf8'))
    } catch (error) {
        console.log(` [x] Error: ${red('Error reading file')} ${fileName} \n`, error)
        printHelp()
        exitWithError()
    }
}

const writeFile = (fileName, content) => {
    try {
        fs.writeFileSync(fileName, content)
    } catch (err) {
        console.log(red(`  ...error saving file ${fileName}`))
        exitWithError()
    }
}

const getOption = (option, defaultValue) => {
    const { argv } = process
    if (argv.includes(option)) {
        try {
            return argv[argv.indexOf(option) + 1]
        } catch (error) {
            console.log(' Error with variability params: ')
            console.log(error)
            printHelp()
            exitWithError(1)
        }
    }
    return defaultValue
}

const getVariability = () => parseFloat(getOption(OPTION_VARIABILITY, DEFAULT_VARIABILITY))
const getUrl = () => getOption(OPTION_URL, false)
const getSnapshotFile = () => getOption(OPTION_SNAPSHOT, DEFAULT_SNAPSHOT_FILE)
const getCategories = () => getOption(OPTION_CATEGORIES, DEFAULT_CATEGORIES).split(',')
const isDebuged = () => process.argv.includes(OPTION_DEBUG)

const getIgnoreFields = () => {
    if (fs.existsSync(IGNORE_FILE)) {
        console.log(' Using ignore file')
        return readFile(IGNORE_FILE)
    }
    return []
}

const compareScores = (oldScore, newScore, variability) => oldScore * (1 - variability) > newScore

const printHelp = () => {
    console.log(' Usage: node lighthouse.js (options)\n')
    console.log(' Options:')
    console.log(` ${OPTION_URL} <url>                Url for the audit (required)`)
    console.log(` ${OPTION_VARIABILITY} <percent>    Percent of variability in score variation (${DEFAULT_VARIABILITY} by default)`)
    console.log(`                            example: ${OPTION_VARIABILITY} 0.2)`)
    console.log(` ${OPTION_SNAPSHOT} <snapshotName>  Name of de JSON snapshot file ('${DEFAULT_SNAPSHOT_FILE}' by default)`)
    console.log(`                            example: ${OPTION_SNAPSHOT} ${DEFAULT_SNAPSHOT_FILE})`)
    console.log(` ${OPTION_CATEGORIES} <categories>  Audit categories. Without spaces. Separated by commas`)
    console.log(`                            example: ${OPTION_CATEGORIES} ${DEFAULT_CATEGORIES})`)
    console.log(` ${OPTION_HELP}                     Show this message`)
    console.log('\n')
}

const lint = (snapshotConfig, jsonInput, reportHTML) => {
    const errors = []
    let snapshotTotalScore = 0
    let totalScore = 0
    let analysed = 0
    let ignored = 0
    let skipped = 0
    let totalNewFields = 0
    const variability = getVariability()
    const ignoreFields = getIgnoreFields()

    Object.keys(jsonInput.audits).forEach(element => {
        if (snapshotConfig.audits[element] &&
            snapshotConfig.audits[element].score
        ) {
            const initialScore = snapshotConfig.audits[element].score
            const newScore = jsonInput.audits[element].score
            totalScore += newScore
            snapshotTotalScore += initialScore
            analysed++
            if (!jsonInput.audits[element].score) {
                skipped++
                return
            }
            if (ignoreFields.includes(element)) {
                ignored++
                return
            }
            if (compareScores(initialScore, newScore, variability)) {
                errors.push({
                    initialScore,
                    newScore,
                    field: element,
                    fieldInfo: jsonInput.audits[element],
                })
            }
        } else {
            totalNewFields++
        }
    })

    if (errors.length) {
        console.log(`\n Lighthouse audit founds ${red(errors.length)} error(s):`)
        errors.forEach(({ initialScore, newScore, field, fieldInfo }) => {
            console.log(white(`\n Error on ${yellow(fieldInfo.title)} (${field}).`))
            console.log(` The previous score (${red(initialScore)}) greater than actual score (${red(newScore)})`)
            console.log(` ${fieldInfo.description}`)
            if (isDebuged()) {
                const answer = prompt(` Do you want add ${yellow(field)} to ignored elements? (y/N)`)
                if ((answer || '').trim().toUpperCase() === 'Y') {
                    ignoreFields.push(field)
                }
            }
        })
        console.log(`\n Previous total score (${red(snapshotTotalScore.toFixed(2))}) greater than actual total score (${red(totalScore.toFixed(2))})\n`)
    }

    totalNewFields && console.log(` Warning: No tested items with score (${red(totalNewFields)})\n`)
    console.log(` ${white(analysed)} analyzed scores: ${blue(skipped)} skipped scores, ${yellow(ignored)} ignored scores and ${red(errors.length)} error(s) founds`)

    if (isDebuged()) {
        console.log(` > Updating ${white(IGNORE_FILE)}...`)
        writeFile(IGNORE_FILE, JSON.stringify(ignoreFields))
    }

    if ((totalScore < snapshotTotalScore) && isDebuged()) {
        const answer = prompt(' [?] Do you want to update the snapshot? (y/N)')
        if ((answer || '').trim().toUpperCase() === 'Y') {
            const file = getSnapshotFile()
            console.log(` > Updating snapshot ${white(file)}...`)
            writeFile(getSnapshotFile(), JSON.stringify(jsonInput))
        }
    }

    if (errors.length) {
        const fileHTML = getSnapshotFile() + '.html'
        console.log(` [>] Saving report in ${white(fileHTML)}`)
        writeFile(fileHTML, reportHTML)
        exitWithError()
    }

    console.log(green(' Lighthouse audition passed.') + ' Total score: ' + yellow(totalScore.toFixed(2)))

    exitWithoutError()
}

async function main () {
    if (process.argv.includes(OPTION_HELP)) {
        printHelp()
        exitWithoutError()
    }
    if (isDebuged()) {
        console.log(' Lighthouse audit info: ' + yellow('Debug mode'))
    }
    
    
    const host = getUrl()
    
    if (!host) {
        console.log(' You must define the url')
        printHelp()
        exitWithError()
    } else {
        console.log(` Auditing ${yellow(host)}`)
    }
    
    
    let report
    
    try {
        console.log(' Categories: ' + yellow(getCategories().join(', ')))
        console.log(' Running with variability of ' + yellow(getVariability() + '%'))
        const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']})
        const options = { logLevel: 'silent', output: ['json', 'html'], onlyCategories: getCategories(), port: chrome.port }
        report = await lighthouse(host, options)
        await chrome.kill()
    } catch (err) {
        console.log(' Error getting lighthouse report\n', err)
        printHelp()
        exitWithError()
    }

    const snapshot = getSnapshotFile()
    const reportJSON = reportGenerator.generateReport(report.lhr, 'json')
    const reportHTML = reportGenerator.generateReport(report.lhr, 'html')

    if (!fs.existsSync(snapshot)) {
        console.log(' Not snapshot file found. ' + yellow(`Saving ${snapshot} with current audit`))
        writeFile(snapshot, reportJSON)
    }

    lint(
        readFile(snapshot),
        JSON.parse(reportJSON),
        reportHTML
    )
}

main()
