const { Octokit } = require("@octokit/core")
const github = require('@actions/github')
const core = require('@actions/core')
const { exec } = require('@actions/exec')
const base64 = require('base-64')
const axios = require('axios')
const fs = require('fs')
const githubToken = core.getInput('github-token')
const octokit = new Octokit({ auth: githubToken})
var path = core.getInput('path')

let param = {
    owner: github.context.payload.repository.owner.name,
    repo: github.context.payload.repository.name
}

async function run(){
    if(githubToken){
        
        let newVersion = await getTag()
            if(newVersion){
                let packageManager = getPackageManager()
                await setVersion(newVersion, packageManager)
                await generateChangelog(packageManager)
                let fileRead = fs.readFileSync(`./CHANGELOG.md`, 'utf8').toString()
                let fileBase64 = base64.encode(fileRead)
                path = 'CHANGELOG.md'
                let content = await getContent()
                let sha = content != 404 ? content.data.sha : null
                uploadGithub(fileBase64, `CHANGELOG.md`, sha)
            }
    }else{
        core.setFailed('O github-token é um parâmetro obrigatório!')
    }
}

async function getTag(){
    try{
        let numberTag = await findTag()
        if(numberTag.status == 200){
            let lastTag = numberTag.data.pop().ref.split('/').pop()
            console.log('A tag encontrada é', lastTag)
            if(!validateTag(lastTag)){
                core.setFailed(`A tag ${lastTag} não é uma tag válida!`)
                return false
            }else{
                return lastTag
            }            
        }
    }catch(error){
        core.setFailed("Não existem tags definidas para esse repositório. crie uma tag e execute a action novamante!", error)
        return false
    }
}

function validateTag(tag){
    
    const defaulTag = tag.match('([v0-9|0-9]+).([0-9]+).([0-9]+)')
    if(defaulTag){
        return tag
    }
    
    return false
}
async function findTag(){
    return octokit.request('GET /repos/{owner}/{repo}/git/refs/tags', param)
}

async function setVersion(newVersion, packageManager){
    let content = await getContent()
    let sha = content != 404 ? content.data.sha : null
    let download_url = content != 404 ? content.data.download_url : null
    if (download_url != null){
        let {data} = await getContentFile(download_url)
        await modifyVersionAndUploadFile(data, sha, newVersion, packageManager)
    }else{
        core.setFailed('Path inválido!')
    }
}

async function getContent(){
    try{
        if(path != 'CHANGELOG.md')
            pathPackageJsonConfigure()
        param['path'] = path
        let res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', param)
        if (res.status  == 200){
            delete param.path
            return res
        }
    }catch(error){
        delete param.path
        return error.status   
    }
}

function pathPackageJsonConfigure(){
    if(path && path != ''){
        if(path.split('/').pop() == ''){
            path = path.slice(0, -1)
            path += '/package.json' 
        }else{
            path = `${path}/package.json`
        }
    }else{
        path = path != '' ? `${path}/package.json`: 'package.json'
        path = `package.json`
    }
}

async function getContentFile (raw_url){
    try{
        return axios.get(raw_url, {
            headers: {
                Authorization: `Bearer ${githubToken}`
            }
        })
    }catch(error){
        core.setFailed('Erro ao carregar o conteúdo do arquivo!')
    }
}

async function modifyVersionAndUploadFile(data, sha, newVersion, packageManager){
    if (data && data != ''){
        try{
            if(packageManager == 'yarn'){
                await exec(`${packageManager} install --ignore-workspace-root-check`)
            }else{
                await exec(`${packageManager} install`)
            }
            let fileRead =  ''
            if(path.split('/').length >1){
                fileRead = path.split('/')[0]== ''? fs.readFileSync(path.substr(1), 'utf8').toString()  : fs.readFileSync(path, 'utf8').toString()
            }else{
                fileRead = fs.readFileSync(`./package.json`, 'utf8').toString()
            }
            let defaultVersion = /"version":[\s]+"([v0-9|0-9]+).([0-9]+).([0-9]+)"/
            newVersion = newVersion.split(/([a-z]|[A-z])+\.*/).pop()
            fileRead = fileRead.replace(defaultVersion, `"version": "${newVersion}"`)
            let fileBase64 = base64.encode(fileRead)
            await uploadGithub(fileBase64, path, sha)
        }catch{
            core.setFailed('Falha ao atualizar a versão do package.json!')
        }
    }else{
        core.setFailed('Falha ao tentar ler arquivo!')
    }
}

async function uploadGithub(content, fileName, sha){
    if(path.substr(0, 1) == '/'){
        path = path.substr(1)
    }
    
    param['path'] = fileName != 'CHANGELOG.md'? path : fileName
    param['message'] = sha == null ? `ci: Create ${fileName}` : `ci: Update ${fileName}`
    param['content'] = content
    if(sha != null)
        param['sha'] = sha

    
    uploadFileBase64()
}

async function uploadFileBase64(){
    try{
        
        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', param).then(()=>{
            console.log({
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                },
                'body': {
                    'message': param.message,
                }
            })
            delete param.path
            delete param.message
            delete param.content
            delete param.sha
            core.setOutput("success", param.message)
            
        })
    }catch(error){
        core.setFailed("Erro ao salvar arquivo: ",error)
    }
}

async function generateChangelog(packageManager){
    if (packageManager == 'yarn'){
        await exec(`${packageManager} add auto-changelog --dev --ignore-workspace-root-check`)
        await exec(`${packageManager} auto-changelog -p`)
    }else{
        await exec(`${packageManager} install auto-changelog --save-dev --ignore-workspace-root-check`)
        await exec(`${packageManager} run changelog`)
    }

}

function getPackageManager(){
    try{
        fs.readFileSync(`./yarn.lock`, 'utf8').toString()
        return 'yarn'
    }catch{
        return 'npm'
    }
}

run()