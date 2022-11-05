---
# try also 'default' to start simple
theme: seriph
# random image from a curated Unsplash collection by Anthony
# like them? see https://unsplash.com/collections/94734566/slidev
background: https://source.unsplash.com/collection/94734566/1920x1080
# apply any windi css classes to the current slide
class: 'text-center'
# https://sli.dev/custom/highlighters.html
highlighter: shiki
# show line numbers in code blocks
lineNumbers: false
# some information about the slides, markdown enabled
info:
  ## Slidev Starter Template
  Presentation slides for developers.

  Learn more at [Sli.dev](https://sli.dev)
# persist drawings in exports and build
drawings:
  persist: true
# use UnoCSS
css: unocss
---

# 《SmartIndex: An Index Advisor with Learned Cost Estimator》CIKM 2022

报告时间：2022 年 11 月 6 日

报告人：唐以恒

<!-- 老师上午好，今天我分享的论文讲的是关于如何依赖基于学习的代价估计器来实现数据库中的索引推荐功能。 -->

---

# 索引推荐 | Index Recommendation

<br/>

在大型关系型数据库中，索引的设计和优化对 SQL 语句的执行效率至关重要，往往依赖 DBA 对数据库引擎内部优化和执行原理的深入理解，进行人工设计和调整索引。

- 缺点：消耗大量时间和人力，同时人工设计的方式并不能确保索引是最优的。

从理论上来说，索引推荐是一个 NP-hard 问题，是指输入数据集、工作负载、存储结果，输出最佳的索引组合。

- 挑战：各个表中的组合可能呈爆炸式增长，在大规模问题上不可能得到最优解。

现有方法倾向于使用 DBMS 查询优化器估计的成本来衡量索引的好处。

- 问题：然而由于 DBMS 代价估算模型的局限性，依赖于 DBMS 优化器可能无法找到最优的索引配置。
- 改进：用基于学习的代价估算方法来衡量索引带来的收益，进而选出最佳的索引组合。

<!-- 在大规模数据的存取上，建立索引可以减少磁盘扫描的次数，提高工作负载下的SQL执行效率。 -->

---

# 相关工作

<br/>

按照任务级别划分：

- **基于单条查询语句**：对于基于单条查询语句的索引推荐，使用者每次向索引设计工具提供一个查询语句，工具会针对该语句生成最佳的索引。
- **基于工作负载**：给定一个包含多种类型SQL语句的工作负载，生成使得系统在该工作负载下的运行时间降至最低的索引集合。

索引推荐任务的核心：如何量化和估计索引对于工作负载的收益？即当该索引组合应用于指定工作负载时，工作负载总代价的减少量。

根据代价估计的方式不同，算法分为两大类：

- **基于优化器的代价估计的方法**：采用 DBMS 查询优化器的代价模型对索引进行代价估计。
- **基于机器学习的代价估计方法**：采用基于神经网络的代价模型来缓解传统代价模型带来的问题。

<!-- 一些数据库支持虚拟索引的功能，虚拟索引没有在存储空间中创建物理索引，而是通过模拟索引的效果来影响优化器的代价估计；但这类方法需要大量的训练数据，并不适用于全部的业务环境。 -->

---

# 本文工作

<br/>

本文开发了一个名为 SmartIndex 的端到端系统来帮助用户使用基于学习的代价估算模型轻松地选择索引。

- 建立基于基于学习的代价估计模型来预测查询计划的执行时间
  - 使用**图卷积网络**（GCN）从查询计划中学习特征。
    - 相比于 LSTM 模型，不需要太多的存储成本，就能达到较高的准确度。
  - 使用**双重注意力模型**从查询计划使用的索引中学习特征。
- 然后再一定的约束条件（比如索引数量、存储成本）下使用贪心方法选择索引。
- 将深度学习方法所有生命周期集成到一个端到端的系统中：
  - 收集和处理训练数据；
  - 构建代价估算模型并训练模型；
    - 动态切换成本估算方法
  - 在得到来自代价估算模型估算的成本后，贪心地选择最佳的索引。

<!-- SmartIndex 为关系型数据库 PostgreSQL 提供了智能索引推荐功能，将索引设计的流程化自动化、标准化，可以分别针对单条查询语句和工作负载推荐最优的索引。 在处理查询时系统会存储查询计划用于训练成本模型；以防万一没有足够的查询计划用于训练，系统会动态在DBMS优化器和学习型模型之间切换。-->

---
layout: two-cols-header
---

# SmartIndex 系统架构

<br/>

::left::

## 三个重要组件：

<br/>

- **候选索引生成（Candidate Index Generation）**：给定用户提供的工作负载，候选索引生成模块查找所有可能的索引，包括多列索引，以优化工作负载中的查询。
- **代价估计（Cost Estimation）**：成本估算模型用于衡量每个候选索引的效益。考虑到时间成本，可以离线训练成本估计模型。
- **索引选择（Index Selection）**：使用贪婪方法从候选索引集中选择索引。选择的依据是通过索引建立前后工作负载执行时间的差异来计算的，将索引的代价节省作为其对工作负载的收益。

::right::

![](https://images-1304805469.cos.ap-chengdu.myqcloud.com/img/20221104223055.png)

<!-- 所有的 SQL 语句都将首先被解析，然后根据 DB2 advisor 中提出的规则生成候选索引，它提取出现在某些子句中的属性，并使用这些属性的组合来格式化候选索引； 为了收集真实的查询计划及其执行时间进行训练，SmartIndex支持处理查询，并建立了历史查询计划队列恢复训练数据并训练模型。特别是在处理 SQL 语句时，系统会维护一个队列来存储唯一的⟨查询计划、执行时间⟩对，用于训练深度学习模型；在每次迭代过程中，都会选择收益最大的索引进入索引集合，模型会一直选择索引，直到达到存储限制或最大索引数。-->

---
layout: center
---

# SmartIndex 系统演示

<img src="https://images-1304805469.cos.ap-chengdu.myqcloud.com/img/20221105102018.png"/>

<!-- 1.数据库详情：指定要连接的数据库，会给出数据库的详细统计信息，包括表和索引；2.SQL控制台：处理SQL，收集训练成本估算模型的查询计划，查询计划及其执行时间作为训练数据存储；3.生成候选索引：添加工作负载并生成候选索引集（添加单条SQL语句或者添加SQL脚本文件）；4.训练成本模型：当训练数据足够时，在该页面中训练模型（设置训练参数、展示训练过程和模型性能）；5.推荐索引。 支持从基于深度学习的模型切换到 DBMS 成本估算模型。索引选择工具支持两种约束：索引数量和索引存储成本。所选索引的详细统计信息将显示在页面左下方。“结果”比较了在建立推荐索引之前/之后给定工作负载的估计执行时间。-->

---
layout: two-cols-header
---

# 核心技术

::left::

- **查询计划表示学习**：设计了一种基于图卷积网络（GCN）的表示学习模型来从树结构输入中学习特征，从而避免查询计划树形结构的信息丢失。
  - 先采用 LSTM 模型对查询计划中的节点进行编码，再遍历查询计划树得到邻接矩阵，这两部分输入到 GCN 中以学习特征。
- **相关索引表示学习**：设计了一个双重注意力模型来学习索引之间和索引内部的关系。
  - 分别用行卷积和列卷积来处理相关索引的特征矩阵，分别得到索引级别和元素级别的注意力，然后使用这两种注意力和原始数据做点乘，最后使用全连接层进一步学习特征并降低特征维度。
- **估计层**：使用表示学习层学到的特征来预测查询计划执行成本。

::right::

![](https://images-1304805469.cos.ap-chengdu.myqcloud.com/img/20221105105017.png)

<!-- 为了从查询计划中学习特征，AVGDL 遍历查询树，将其转换为节点序列，并采用 LSTM 模型从节点序列中学习特征。但是，这种方法可能会导致要学习的信息不准确，因为在转换为节点序列时，树的结构信息会部分丢失。 -->

---
layout: two-cols-header
---

# 模型性能

## 评估代价估算的性能

::left::

- 查询负载：Join Order Benchmark（JOB）
- DBMS：PostgreSQL 11
- Baseline：
  - PGCost：PostgreSQL 中的成本估算模型
  - LSTMCost：在一定存储限制下的最先进的基于学习的成本估计模型，在 AVGDL 中用于物化视图选择。《Automatic View Generation with Deep Learning and Reinforcement Learning》
- 评估计划质量的指标：$q-error$
  - $q-error=\frac{max(c, \hat{c})}{min(c, \hat{c})}$
  - 使用测试集上 $q-error$ 的中值、平均值和最大值来评估模型

::right::

![](https://images-1304805469.cos.ap-chengdu.myqcloud.com/img/20221105105027.png)

---
layout: two-cols-header
---

# 模型性能

## 评估索引选择的性能

::left::

- Baseline：
  - DB2 advisor：《DB2 Advisor: An Optimizer Smart Enough to Recommend its own Indexes》
  - Extend：《Efficient scalable multiattribute index selection using recursive strategies》
- 使用相对执行时间作为度量
  - $r=\frac{t'}{t}$，$t$ 是工作负载的额原始执行时间，$t'$ 是索引选择模型选择的索引下的执行时间。
- 结论：
  - 传统方法由于代价估计不准确导致不稳定的结果，SmartIndex 依赖于基于 CGN 的代价估计，提供更准确的更稳定的索引推荐方法（在任何存储限制下）。

::right::

![](https://images-1304805469.cos.ap-chengdu.myqcloud.com/img/20221105105038.png)

---

# 思考

- **代价估计模型**是很多数据库优化任务的基础
- 如何对**查询计划进行表征学习**是基于深度学习的代价估计模型的基础
- 如何捕捉查询计划的**结构信息**
  - GNN？GCN？GAT？
  - Tree-LSTM？
  - Tree-Transformer？
  - ...
- 强化学习和数据库任务的碰撞
  - 数据库调参
  - 连接顺序选择
  - **索引推荐**
  - 视图选择
  - 查询生成
  - ...