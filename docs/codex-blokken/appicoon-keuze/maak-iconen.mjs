// Zet de bestaande voorstellen om naar Xcode-assets, zonder nieuw beeldmerk.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const root=process.cwd(),require=createRequire(path.join(root,'package.json'))
const sharp=require('sharp'),{Resvg}=require('@resvg/resvg-js')
const source=path.resolve('../Hoot-appicoon/docs/codex-blokken/appicoon'),assets=path.join(root,'ios/Hoot/Assets.xcassets')
const variants=[['AppIcon','a-papier-op-rood'],['AppIconRuim','b-ruim-rood'],['AppIconPapier','c-rood-op-papier'],['AppIconZwart','d-papier-op-inkt']]
// Donker is bij elke keuze exact de bestaande transparante voorgrond. iOS zet de zwarte
// systeemondergrond erachter; de leesstand Nacht doet geen icon-API-aanroep.
const dark=await fs.readFile(path.join(assets,'AppIcon.appiconset/icon-1024-dark.png'))
for(const [set,base]of variants){
 const dir=path.join(assets,set+'.appiconset')
 const light=await sharp(path.join(source,base+'-1024.png')).removeAlpha().png().toBuffer()
 const tint=new Resvg(await fs.readFile(path.join(source,base+'-getint.svg')),{fitTo:{mode:'width',value:1024}}).render().asPng()
 await fs.writeFile(path.join(dir,'icon-1024.png'),light)
 await fs.writeFile(path.join(dir,'icon-1024-dark.png'),dark)
 await fs.writeFile(path.join(dir,'icon-1024-tinted.png'),await sharp(tint).toColourspace('b-w').removeAlpha().png().toBuffer())
}
