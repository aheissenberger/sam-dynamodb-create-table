import fs from 'fs/promises';
import commander from 'commander';
import schema from 'js-yaml-schema-cfn'
import yaml from 'js-yaml'

import AWS from "aws-sdk";
const { program } = commander;

const defautlConfiguration = {
    endpoint: 'http://localhost:8000',
    file: 'template.yaml',
    region: 'us-east-1',
}

export async function createTableFromSAMtemplate(config) {
    let ddb = new AWS.DynamoDB({ endpoint: config.endpoint, region: config.region })

    try {
        const file = await fs.readFile(config.file, 'utf8');
        const samTemplate = yaml.safeLoad(file, { schema: schema })
        const dynamoDBdefinitions = Object.entries(samTemplate.Resources).filter(([key, value]) => value.Type === 'AWS::DynamoDB::Table')

        for (let index = 0; index < dynamoDBdefinitions.length; index++) {
            const tableDef = dynamoDBdefinitions[index];
            const tableName = tableDef[1].Properties.TableName ?? tableDef[0];
            process.stdout.write(`* create Table "${tableName}" ... `)
            await createTable(tableName, tableDef[1].Properties, config.debug)
        }


    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1)
    }

    async function createTable(name, params, debug) {
        const dbparams = { ...params, TableName: name }
        delete dbparams.TimeToLiveSpecification // fix bug in AWS-SDK
        try {
            const result = await ddb.createTable(dbparams).promise();
            process.stdout.write("created.\n")
            if (debug) console.log(JSON.stringify(result, null, 3))
        } catch (error) {
            process.stdout.write("failed to create.\n")
            console.error('ERROR:', error.code);
        }

    }
}

export async function main() {
    program
        .option('-d, --debug', 'output extra debugging information')
        .option('-c, --configuration <filename>', 'configuration file - format JSON')
        .option('-f, --file <filename>', `sam template.yaml (default: ${defautlConfiguration.file})`)
        .option('-e, --endpoint <url>', `dynamoDB endpoint url (default: ${defautlConfiguration.endpoint})`)
        .option('-r, --region <region>', `AWS region (default: ${defautlConfiguration.region})`)
        .option('--config-template', 'output JSON config template', false);
    program.parse(process.argv);

    const configOpts = program.opts();
    delete configOpts.configTemplate;

    let configImport = {}
    if (program.configuration) {
        try {
            const configSJON = await fs.readFile(configOpts.configuration, 'utf8');
            configImport = JSON.parse(configSJON);

        } catch (error) {
            console.error('ERROR:', error.message);
            process.exit(1)
        }
    }

    const configOptsOverwrite = Object.fromEntries(Object.entries(configOpts).filter(([key, value]) => value !== undefined));

    const config = { ...defautlConfiguration, ...configImport, ...configOptsOverwrite }

    if (program.configTemplate) {
        delete config.configuration;
        console.log(JSON.stringify(config, null, 3))
        process.exit()
    }

    if (program.debug) { console.log(JSON.stringify(config, null, 3)) }

    await createTableFromSAMtemplate(config)
}


