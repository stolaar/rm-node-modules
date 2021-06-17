const {execSync} = require('child_process')
const fs = require('fs')

const {PROJECTS_PATH} = process.env

if(!PROJECTS_PATH) {
    throw new Error('Please set PROJECTS_PATH variable')
}

const daysOld = (Number(process.env.DAYS_OLD) || 20)
const endDate = Date.now() - 1000 * 60 * 60 * 24 * daysOld

const excludeProjects = ['rm_node_modules', '.git']


let totalModules = 0
let removedModules = 0
let errorRemovingModules = 0

async function removeOldNodeModules(path) {
    const files = await fs.promises.readdir(path)

    if(files.includes('node_modules') 
    && !excludeProjects.some(val => new RegExp(path, 'g').test(val))
    && files.includes('.git')) {
        totalModules++
        const date = getCommitDate(path)
        if(date instanceof Date) {
            if(date.getTime() < endDate) {
                console.log('SHOULD REMOVE', `${path}/node_modules`)
                try {
                    await new Promise((resolve, reject) => {
                        fs.rmdir(`${path}/node_modules`, {recursive: true}, (err) => {
                            if(err) return reject(err)
                            return resolve()
                        })
                    }) 
                    removedModules++
                } catch(err) {
                    console.error('Error removing node_modules', err)
                    errorRemovingModules++
                }
                
            }
        }
    } else if(files.length) {
        for (let file of files) {
            const stat = fs.statSync(`${path.toString()}/${file}`)

            if(stat.isDirectory() && !excludeProjects.includes(file)) {
                await removeOldNodeModules(`${path.toString()}/${file}`)
            }
         }
    } 
    return
}

function getCommitDate(path) {
    try {
        const date = execSync(`cd ${path} && git log -1 --format=%cd`, {stdio: 'pipe'}).toString()
        return date ? new Date(date) : date
    } catch (err) {
        console.error(err.message)
    }
}

removeOldNodeModules(PROJECTS_PATH).then(() => {
    console.log('Total node_modules found',totalModules)
    console.log('Total node_modules removed',removedModules)
    console.log('Total node_modules remove errors',errorRemovingModules)
})