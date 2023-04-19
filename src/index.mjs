import fs from 'node:fs/promises';
import { Command } from 'commander';
import schema from 'js-yaml-schema-cfn'
import yaml from 'js-yaml'

import { DynamoDB } from "@aws-sdk/client-dynamodb";

const program = new Command();

const defautlConfiguration = {
    endpoint: 'http://localhost:8000',
    file: 'template.yaml',
    region: 'us-east-1',
}


export async function createTableFromSAMtemplate(config) {
    let ddb = new DynamoDB({ endpoint: config.endpoint, region: config.region })

    try {
        const file = await fs.readFile(config.file, 'utf8');
        const ext = config.file.split('.').pop()
        const samTemplate = ext === 'yaml' ? yaml.load(file, { schema: schema }) : JSON.parse(file)
        const dynamoDBdefinitions = ext === 'yaml' ? Object.entries(samTemplate.Resources).filter(([key, value]) => value.Type === 'AWS::DynamoDB::Table') : [[config.tableName,samTemplate]]

        for (let index = 0; index < dynamoDBdefinitions.length; index++) {
            const tableDef = dynamoDBdefinitions[index];
            const tableName =  tableDef[1]?.Properties?.TableName ?? tableDef[0];
            if (ext === 'json' && tableName === undefined) throw new Error('tableName is not defined! Use --table-name or add tableName to configuration file.')
            process.stdout.write(`* create Table "${tableName}" ... `)
            await createTable(tableName, tableDef[1].Properties, config.debug)
        }


    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1)
    }

    async function createTable(name, params, debug) {
        if (debug) console.log(JSON.stringify(params,null,2))
        // fix broken definition
        console.log("")
        if (params?.ProvisionedThroughput===undefined) {
            params.ProvisionedThroughput = { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
            console.log('fix: set ProvisionedThroughput to 1/1')
        }
        if (params?.GlobalSecondaryIndexes) {
            if (params?.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput===undefined) {
                params.GlobalSecondaryIndexes[0].ProvisionedThroughput = { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
                console.log('fix: set GlobalSecondaryIndexes / ProvisionedThroughput to 1/1')
            }
            if (typeof params?.GlobalSecondaryIndexes?.[0]?.Projection=== 'string') {
                params.GlobalSecondaryIndexes[0].Projection={
                    ProjectionType: params?.GlobalSecondaryIndexes?.[0]?.Projection
                }
                console.log('fix: convert GlobalSecondaryIndexes.Projection from string to object')
            }
        }
       
        if (debug) console.log(JSON.stringify(params,null,2))
        const dbparams = { ...params, TableName: name }
        delete dbparams.TimeToLiveSpecification // fix bug in AWS-SDK
        try {
            const result = await ddb.createTable(dbparams);
            process.stdout.write("created.\n")
            if (debug) console.log(JSON.stringify(result, null, 2))
        } catch (error) {
            process.stdout.write("failed to create.\n")
            console.error('ERROR:', error);
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
        .option('--table-name <tablename>', `table name is required for cloudformation template`)
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


