import { PhotoAnalysis } from '../types';

export const sampleAnalyses: Record<string, PhotoAnalysis> = {
  'sample1': {
    "scores": {
      "composition": 6,
      "lighting": 8,
      "creativity": 5,
      "technique": 7,
      "subjectImpact": 7
    },
    "critique": {
      "composition": "画面信息量较大，包含了多个局部细节放大图。圆形构图虽然能展示产品特性，但文字排版稍显拥挤，且右下角的文案存在拼写错误（Absorben 缺少字母 t）。",
      "lighting": "使用了均匀的无影平光，产品细节（超细纤维的颗粒感）展现得非常清晰，没有多余的阴影干扰，适合电商详情页的功能展示。",
      "technique": "微距和细节部分的清晰度极高，色彩还原准确（鲜艳的绿色对比中性背景）。但整体拼贴感较强，缺少真实场景的纵深感。",
      "overall": "这是一张标准的电商产品细节说明图（A+图）。最大的硬伤在于文案拼写错误，其次是排版可以更加呼吸感强一些。材质的细节表现非常出色。"
    },
    "strengths": [
      "超细纤维的材质细节非常清晰、有质感",
      "使用了局部放大镜的设计，直观展示产品卖点",
      "色彩搭配清新，符合清洁用品的定位"
    ],
    "improvements": [
      "修正右下角的严重拼写错误：'Highly Absorben' 改为 'Highly Absorbent'",
      "优化排版，给中英文案和局部放大图之间留出更多的负空间（负白）",
      "主标题区域的背景弧线稍微有些生硬，可以过渡得更柔和"
    ],
    "learningPath": [
      "学习电商排版中的 '负空间' 原则，避免画面过度拥挤",
      "建立严格的发布前图文 QA（质量检测）流程，避免基础拼写错误",
      "尝试使用真实的阴影渲染来替代生硬的几何色块切割"
    ],
    "settingsEstimate": {
      "focalLength": "100mm (微距镜头)",
      "aperture": "f/11 (保证细节全景深)",
      "shutterSpeed": "1/125s",
      "iso": "100"
    },
    "boundingBoxes": [
      {
        "type": "composition",
        "severity": "critical",
        "x": 62,
        "y": 90,
        "width": 18,
        "height": 5,
        "description": "文案拼写错误：'Absorben' 缺少了结尾的 't'，这在专业电商图上是致命瑕疵，会严重降低顾客信任感。",
        "suggestion": "立即更正拼写为 'Absorbent'。"
      },
      {
        "type": "composition",
        "severity": "minor",
        "x": 60,
        "y": 66,
        "width": 30,
        "height": 4,
        "description": "文案与边缘的距离过近，视觉呼吸感不足。",
        "suggestion": "缩小文字字号或者增加内边距。"
      }
    ],
    "thinking": {
      "observations": [
        "这是一张拼贴风格的拖把头细节图。",
        "产品纹理非常清晰，使用了三个放大镜效果展示不同卖点。",
        "发现了错别字 'Absorben'。"
      ],
      "reasoningSteps": [
        "作为电商摄影分析，不仅看光影，还要看视觉传达的准确性。",
        "光线非常适合产品细节展示（平光）。",
        "构图上采用了左大右小的权重分布，基本平衡，但文字区域局促。",
        "拼写错误是最高优先级的修复点。"
      ],
      "priorityFixes": [
        "1. 修复 Highly Absorbent 的拼写错误",
        "2. 改善右上角放大镜的边缘排版，增加负空间"
      ]
    }
  },
  'sample2': {
    "scores": {
      "composition": 4,
      "lighting": 5,
      "creativity": 3,
      "technique": 4,
      "subjectImpact": 6
    },
    "critique": {
      "composition": "构图显得非自然且混乱。两个拖把同时出现在画面中，但并非真实的物理空间关系，透视感存在严重冲突。",
      "lighting": "产品本身的光照（亮红色，有高光）与深色地砖环境的光照完全不匹配，泡沫的质感和边缘光也极其突兀，缺乏真实的全局光照同步。",
      "technique": "这是一张质量不高的合成图（PS 扣图）。拖把边缘僵硬，地面的泡沫非常扁平、虚假，仿佛是直接贴上去的 2D 贴图。",
      "overall": "这张场景合成图的 '虚假感' 过强。透视错误、光影不一致以及劣质的泡沫素材反而会拉低产品的专业感。建议重新进行实景拍摄或使用高质量的 3D 渲染。"
    },
    "strengths": [
      "拖把头本身的产品纹理和工业设计展示得还算清晰",
      "灰黑色背景很好地衬托了红色的产品主体"
    ],
    "improvements": [
      "完全摒弃这种低质量的 2D 贴图合成，改为实景拍摄（真实的泡沫、真实的水迹）",
      "统一光源方向：如果地砖是暗调的，拖把上的反光必须对应环境光",
      "修正前后拖把的体积透视关系，或者干脆只保留一个主体"
    ],
    "learningPath": [
      "学习基本的 3D 透视原理和焦距对空间压缩的影响",
      "学习高级图像合成技术：匹配黑白场、匹配色彩映射、统一光源方向",
      "建立高质量的材质库（购买真实的泡沫素材或实拍）"
    ],
    "settingsEstimate": {
      "focalLength": "合成图片（无实际光学参数）",
      "aperture": "N/A",
      "shutterSpeed": "N/A",
      "iso": "N/A"
    },
    "boundingBoxes": [
      {
        "type": "exposure",
        "severity": "critical",
        "x": 10,
        "y": 55,
        "width": 38,
        "height": 40,
        "description": "极其虚假的 2D 泡沫素材。没有景深变化，没有对环境的反光，边缘生硬如同贴纸，严重破坏真实感。",
        "suggestion": "移除该素材，使用实拍的肥皂水或更高质量的 3D 渲染液态体积。"
      },
      {
        "type": "focus",
        "severity": "moderate",
        "x": 42,
        "y": 14,
        "width": 12,
        "height": 18,
        "description": "远景拖把杆的透视切割和边缘融合极不自然，出现了不符合物理规律的悬浮感。",
        "suggestion": "使用阴影和接触面修饰使其落地，或重拍。"
      }
    ],
    "thinking": {
      "observations": [
        "深色石材地面上的红色拖把。",
        "左下角有大量合成的白色泡沫。",
        "背景有一个拖把桶和另一个拖把杆。"
      ],
      "reasoningSteps": [
        "首先判断是否实拍：明显为后期劣质合成。",
        "寻找合成破绽：泡沫素材是 2D 贴面；前后拖把透视不在同一空间；光影完全割裂。",
        "评估商业影响：这种图会降低消费者对品牌品质的信任。"
      ],
      "priorityFixes": [
        "1. 替换或重新实拍真实的清洁泡沫场景",
        "2. 修复前后景的透视和光影逻辑统一性"
      ]
    }
  },
  'sample3': {
    "scores": {
      "composition": 5,
      "lighting": 5,
      "creativity": 6,
      "technique": 4,
      "subjectImpact": 7
    },
    "critique": {
      "composition": "尝试通过宠物（猫狗）来营造生活场景和趣味性，这是一个很好的创意。但画面右下角巨大的绿色拖把头完全破坏了比例，显得荒谬。",
      "lighting": "室内的光线是自然柔和的家居光，但右下角的绿色拖把及圆形放大镜头的光线极其突兀，没有受到任何环境光的影响。",
      "technique": "合成痕迹十分拙劣。拖把头的抠图边缘有白边，而且大小比例完全失调，比一只狗还要大。放大的细节图也显得像个悬浮的飞碟。",
      "overall": "创意出发点极佳（主打宠物家庭的清洁痛点），但在执行上是灾难级的合成错误。透视失调和强烈的违和感让它看起来像搞笑图片而非商品宣传图。"
    },
    "strengths": [
      "选择了宠物家庭作为痛点场景，受众带入感强",
      "居室的背景色调温馨，营造了不错的情绪价值"
    ],
    "improvements": [
      "完全重塑比例：拖把头必须缩小到真实符合人使用的比例，不能比狗还大",
      "优化素材融合：为拖把头添加真实的地板接触阴影和环境光反射",
      "细节放大圆框需要重新设计UI，目前这种带有黄色粗边框的设计显得廉价并干扰了画面"
    ],
    "learningPath": [
      "学习合成图像中的 '比例与参照物'（Scale and Reference）黄金法则",
      "学习阴影的绘制：接触阴影（Contact Shadow）和环境光遮蔽（AO）",
      "研究现代电商的干净 UI 细节引导线设计，摒弃粗糙的线框"
    ],
    "settingsEstimate": {
      "focalLength": "合成图片（背景约 35mm，前景不合理）",
      "aperture": "N/A",
      "shutterSpeed": "N/A",
      "iso": "N/A"
    },
    "boundingBoxes": [
      {
        "type": "exposure",
        "severity": "critical",
        "x": 58,
        "y": 50,
        "width": 40,
        "height": 45,
        "description": "极度失调的比例（透视错误）。拖把头被放大到了近乎怪兽的体型，破坏了家居场景的所有真实感。",
        "suggestion": "将拖把头按照真实的远近透视比例缩小，使其符合人类工具的尺寸。"
      },
      {
        "type": "color",
        "severity": "moderate",
        "x": 28,
        "y": 62,
        "width": 28,
        "height": 34,
        "description": "放大镜的粗大黄色边框严重干扰视线，且与整体家居清新的调色不搭配，有廉价感。",
        "suggestion": "改用极细的白色或浅灰边框，配合纤细的引导线进行细节展示。"
      }
    ],
    "thinking": {
      "observations": [
        "温馨的木质宠物家庭背景，有一猫一狗。",
        "右下角突然出现了一个极其巨大的亮绿色拖把头。",
        "包含了一个展示毛发吸附的局部放大图。"
      ],
      "reasoningSteps": [
        "情感与场景评估：用宠物来卖清洁用品，思路是对的。",
        "视觉合理性评估：立刻察觉到拖把的尺寸和透视完全崩坏。",
        "技术评估：抠图粗糙，无阴影，黄色线框 UI 丑陋。"
      ],
      "priorityFixes": [
        "1. 纠正拖把头的恐怖尺寸，恢复正常比例",
        "2. 补充地板的接触阴影",
        "3. 重新设计局部放大视图的 UI 样式"
      ]
    }
  }
};
